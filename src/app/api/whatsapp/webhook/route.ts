import { NextRequest, NextResponse } from 'next/server'
import { setLidPhone } from '@/lib/lid-map'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'

/**
 * Webhook receiver for Evolution API events.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const event = body.event || ''
        const data = body.data || body

        const messages = Array.isArray(data) ? data : [data]

        for (const msg of messages) {
            const key = msg.key || {}
            const remoteJid: string = key.remoteJid || msg.remoteJid || ''
            const senderPn: string = msg.senderPn || ''
            const messageId: string = key.id || msg.messageId || ''
            const pushName: string = msg.pushName || ''
            const fromMe: boolean = key.fromMe || false

            if (!remoteJid || !messageId) continue

            // LID mapping logic
            if (remoteJid.endsWith('@lid') && senderPn) {
                const phone = senderPn.replace('@s.whatsapp.net', '').replace('@lid', '')
                setLidPhone(remoteJid, phone)
            }
            const participant: string = key.participant || msg.participant || ''
            if (participant.endsWith('@lid') && senderPn) {
                const phone = senderPn.replace('@s.whatsapp.net', '').replace('@lid', '')
                setLidPhone(participant, phone)
            }

            // Sync to Database if it is a real message creation event
            if (event === 'messages.upsert') {
                // Determine message content
                let content = ''
                let type = 'text'
                let hasMedia = false

                const m = msg.message || {}

                content =
                    (m.conversation as string) ||
                    ((m.extendedTextMessage as Record<string, unknown>)?.text as string) ||
                    ((m.imageMessage as Record<string, unknown>)?.caption as string) ||
                    ((m.videoMessage as Record<string, unknown>)?.caption as string) ||
                    ((m.documentMessage as Record<string, unknown>)?.fileName as string) ||
                    ((m.buttonsResponseMessage as Record<string, unknown>)?.selectedDisplayText as string) ||
                    ((m.listResponseMessage as Record<string, unknown>)?.title as string) ||
                    ((m.templateButtonReplyMessage as Record<string, unknown>)?.selectedDisplayText as string) ||
                    ''

                if (m.imageMessage) {
                    type = 'image'
                    hasMedia = true
                    if (!content) content = '📷 Imagem'
                } else if (m.videoMessage) {
                    type = 'video'
                    hasMedia = true
                    if (!content) content = '🎬 Vídeo'
                } else if (m.audioMessage) {
                    type = 'audio'
                    hasMedia = true
                    if (!content) content = '🎵 Áudio'
                } else if (m.documentMessage) {
                    type = 'document'
                    hasMedia = true
                    if (!content) content = '📄 Documento'
                } else if (m.stickerMessage) {
                    type = 'sticker'
                    hasMedia = true
                    if (!content) content = '🏷️ Figurinha'
                }

                // If no text, and no standard media is identified, skip or save generic
                if (!content && !hasMedia) {
                    content = 'Mensagem de sistema ou mídia não suportada'
                }

                // We need an Account ID and Contact ID to save in Prisma CRM structure
                // For MVP, we fetch the FIRST account, or create a dummy one
                let account = await prisma.account.findFirst()
                if (!account) {
                    account = await prisma.account.create({
                        data: { name: 'Conta Principal', plan: 'pro' }
                    })
                }

                // Upsert Contact
                let contact = await prisma.contact.findFirst({
                    where: { phone: remoteJid, accountId: account.id }
                })
                if (!contact) {
                    contact = await prisma.contact.create({
                        data: {
                            accountId: account.id,
                            name: pushName || remoteJid,
                            phone: remoteJid,
                        }
                    })
                }

                // Upsert Conversation
                let conversation = await prisma.conversation.findUnique({
                    where: { whatsappJid: remoteJid }
                })

                if (!conversation) {
                    conversation = await prisma.conversation.create({
                        data: {
                            whatsappJid: remoteJid,
                            accountId: account.id,
                            contactId: contact.id,
                            channel: 'WHATSAPP',
                            status: 'OPEN',
                            unreadCount: fromMe ? 0 : 1
                        }
                    })
                } else if (!fromMe) {
                    // Increment unread count if received
                    await prisma.conversation.update({
                        where: { id: conversation.id },
                        data: { unreadCount: { increment: 1 } }
                    })
                }

                // Upsert Message
                const savedMessage = await prisma.message.upsert({
                    where: { whatsappId: messageId },
                    create: {
                        whatsappId: messageId,
                        whatsappJid: remoteJid,
                        content,
                        type,
                        fromMe,
                        sender: fromMe ? 'USER' : 'CONTACT',
                        senderName: pushName,
                        conversationId: conversation.id,
                        isRead: fromMe, // Sent messages are read by default
                    },
                    update: {} // No update needed for now if it already exists
                })

                // Broadcast new message via Supabase Realtime
                await supabaseAdmin.channel('whatsapp_updates').send({
                    type: 'broadcast',
                    event: 'new_message',
                    payload: {
                        message: {
                            id: savedMessage.whatsappId,
                            content: savedMessage.content,
                            type: savedMessage.type,
                            fromMe: savedMessage.fromMe,
                            remoteJid: savedMessage.whatsappJid,
                            timestamp: savedMessage.createdAt.toISOString(),
                            senderName: savedMessage.senderName,
                            hasMedia: ['image', 'video', 'audio', 'document', 'sticker'].includes(savedMessage.type)
                        },
                        chat: {
                            id: conversation.whatsappJid,
                            unreadCount: conversation.unreadCount
                        }
                    }
                })
            }

            // Sync Read Receipts from Mobile to CRM
            if (event === 'messages.update') {
                const status = msg.status || ''

                // 3 equates to READ, 4 equates to PLAYED (Voice notes)
                // Sometimes Evolution sends string "READ" too
                if (status === 'READ' || status === 3 || status === 4) {
                    // Update database
                    await prisma.conversation.updateMany({
                        where: { whatsappJid: remoteJid },
                        data: { unreadCount: 0 }
                    })

                    await prisma.message.updateMany({
                        where: { whatsappJid: remoteJid, isRead: false },
                        data: { isRead: true }
                    })

                    // Broadcast read event to clients
                    await supabaseAdmin.channel('whatsapp_updates').send({
                        type: 'broadcast',
                        event: 'read_receipt',
                        payload: {
                            chat: { id: remoteJid, unreadCount: 0 }
                        }
                    })
                }
            }
        }

        if (event) {
            console.log(`[Webhook] Processed Event: ${event}, messages: ${messages.length}`)
        }

        return NextResponse.json({ status: 'ok' })
    } catch (error) {
        console.error('[Webhook] Error:', error)
        return NextResponse.json({ status: 'ok' }) // Always 200 to prevent Evolution API retries
    }
}

// Evolution API may also send GET for webhook verification
export async function GET() {
    return NextResponse.json({ status: 'active', service: 'nexcrm-webhook' })
}
