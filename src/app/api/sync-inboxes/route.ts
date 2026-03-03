import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { normalizeJid, extractPhoneFromJid } from '@/lib/evolution'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

async function evoFetch(path: string, body?: any) {
    const res = await fetch(`${EVOLUTION_API_URL}${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
    })
    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Evolution ${res.status}: ${text.substring(0, 200)}`)
    }
    return res.json()
}

function extractContent(msg: any): string {
    const m = msg.message || {}
    return m.conversation
        || m.extendedTextMessage?.text
        || m.imageMessage?.caption
        || m.videoMessage?.caption
        || m.documentWithCaptionMessage?.message?.documentMessage?.caption
        || m.documentMessage?.fileName
        || (m.audioMessage ? '🎵 Áudio' : '')
        || (m.stickerMessage ? '🏷️ Figurinha' : '')
        || (m.imageMessage ? '📷 Imagem' : '')
        || (m.videoMessage ? '🎬 Vídeo' : '')
        || (m.documentMessage ? '📄 Documento' : '')
        || ''
}

function extractType(msg: any): string {
    const m = msg.message || {}
    if (m.imageMessage || m.viewOnceMessage?.message?.imageMessage || m.viewOnceMessageV2?.message?.imageMessage) return 'image'
    if (m.videoMessage || m.viewOnceMessage?.message?.videoMessage || m.viewOnceMessageV2?.message?.videoMessage) return 'video'
    if (m.audioMessage) return 'audio'
    if (m.documentMessage || m.documentWithCaptionMessage) return 'document'
    if (m.stickerMessage) return 'sticker'
    return 'text'
}

export async function POST(req: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const inboxes = await prisma.inbox.findMany()
    const results: Record<string, any> = {}

    for (const inbox of inboxes) {
        if (inbox.status !== 'CONNECTED') {
            results[inbox.name] = { skipped: true, reason: `status=${inbox.status}` }
            continue
        }

        const inboxResult = { chatsFetched: 0, synced: 0, messagesCreated: 0, contactsCreated: 0, errors: 0, errorSamples: [] as string[] }

        try {
            // Fetch all chats from Evolution API
            let chats: any[] = []
            try {
                const raw = await evoFetch(`/chat/findChats/${inbox.instanceName}`, {})
                chats = Array.isArray(raw) ? raw : (raw?.records || raw?.chats || [])
            } catch (e: any) {
                results[inbox.name] = { error: `Failed to fetch chats: ${e.message}` }
                continue
            }

            const validChats = chats.filter((c: any) => c.remoteJid && (c.remoteJid.includes('@s.whatsapp.net') || c.remoteJid.includes('@g.us')))
            inboxResult.chatsFetched = validChats.length

            // Process each chat
            for (const chat of validChats) {
                const rawJid = chat.remoteJid as string
                const jid = normalizeJid(rawJid, `sync/${inbox.instanceName}`)
                if (!jid) continue

                try {
                    // Fetch messages for this chat
                    let msgs: any[] = []
                    try {
                        const msgsRes = await evoFetch(`/chat/findMessages/${inbox.instanceName}`, {
                            where: { key: { remoteJid: rawJid } }
                        })
                        if (Array.isArray(msgsRes)) msgs = msgsRes
                        else if (msgsRes?.messages?.records) msgs = msgsRes.messages.records
                        else if (Array.isArray(msgsRes?.records)) msgs = msgsRes.records
                    } catch {
                        // Skip if can't fetch messages for this chat
                        continue
                    }

                    if (msgs.length === 0) continue

                    // Upsert Contact
                    const phone = extractPhoneFromJid(jid)
                    let contact = await prisma.contact.findFirst({
                        where: { phone: jid, accountId: inbox.accountId }
                    })
                    if (!contact && phone) {
                        // Also try by digits only
                        contact = await prisma.contact.findFirst({
                            where: { phone: { startsWith: phone.slice(0, 8) }, accountId: inbox.accountId }
                        })
                    }
                    if (!contact) {
                        try {
                            contact = await prisma.contact.create({
                                data: {
                                    accountId: inbox.accountId,
                                    name: chat.pushName || chat.name || jid,
                                    phone: jid,
                                }
                            })
                            inboxResult.contactsCreated++
                        } catch {
                            // Unique constraint — find existing
                            contact = await prisma.contact.findFirst({
                                where: { phone: jid, accountId: inbox.accountId }
                            })
                            if (!contact) continue
                        }
                    }

                    // Upsert Conversation
                    let conversation = await prisma.conversation.findFirst({
                        where: { whatsappJid: jid, inboxId: inbox.id }
                    })
                    if (!conversation) {
                        // Also try with raw JID
                        conversation = await prisma.conversation.findFirst({
                            where: { whatsappJid: rawJid, inboxId: inbox.id }
                        })
                    }
                    if (!conversation) {
                        try {
                            conversation = await prisma.conversation.create({
                                data: {
                                    accountId: inbox.accountId,
                                    contactId: contact.id,
                                    inboxId: inbox.id,
                                    whatsappJid: jid,
                                    status: 'OPEN',
                                    channel: 'WHATSAPP',
                                    unreadCount: 0,
                                }
                            })
                        } catch {
                            // Unique constraint — find
                            conversation = await prisma.conversation.findFirst({
                                where: { whatsappJid: jid, inboxId: inbox.id }
                            })
                            if (!conversation) continue
                        }
                    }

                    // Upsert Messages (batch)
                    for (const msg of msgs) {
                        const messageId = msg.key?.id
                        if (!messageId) continue

                        const fromMe = msg.key?.fromMe === true
                        const content = extractContent(msg) || ''
                        const type = extractType(msg)
                        const participant = msg.key?.participant || ''
                        const partJid = normalizeJid(participant, `sync/msg/${messageId}`) || null
                        const partPhone = extractPhoneFromJid(partJid) || null

                        try {
                            await prisma.message.upsert({
                                where: { id: messageId },
                                create: {
                                    id: messageId,
                                    whatsappId: messageId,
                                    whatsappJid: jid,
                                    content,
                                    type,
                                    fromMe,
                                    isRead: true,
                                    sender: fromMe ? 'AGENT' : 'CONTACT',
                                    senderName: fromMe ? null : (msg.pushName || null),
                                    participantJid: partJid,
                                    participantPhone: partPhone,
                                    conversationId: conversation.id,
                                    inboxId: inbox.id,
                                },
                                update: {}
                            })
                            inboxResult.messagesCreated++
                        } catch { /* skip duplicates */ }
                    }

                    inboxResult.synced++
                } catch (e: any) {
                    inboxResult.errors++
                    if (inboxResult.errorSamples.length < 3) {
                        inboxResult.errorSamples.push(`${rawJid}: ${e.message?.substring(0, 100)}`)
                    }
                }
            }

            // Get final counts
            const finalMsgs = await prisma.message.count({ where: { inboxId: inbox.id } })
            const finalConvs = await prisma.conversation.count({ where: { inboxId: inbox.id } })
            results[inbox.name] = { ...inboxResult, totalMessages: finalMsgs, totalConversations: finalConvs }
        } catch (e: any) {
            results[inbox.name] = { error: e.message }
        }
    }

    return NextResponse.json({ success: true, results })
}
