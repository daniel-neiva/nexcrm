import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

async function evolutionFetch(path: string, options: RequestInit = {}) {
    const res = await fetch(`${EVOLUTION_API_URL}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY, ...(options.headers as Record<string, string> || {}) },
        cache: 'no-store'
    })
    if (!res.ok) throw new Error(`Evolution ${res.status}: ${(await res.text()).substring(0, 200)}`)
    return res.json()
}

function extractContent(msg: any): string {
    const m = msg.message || {}
    return m.conversation
        || m.extendedTextMessage?.text
        || m.imageMessage?.caption
        || m.videoMessage?.caption
        || m.documentMessage?.title
        || (m.audioMessage ? '[Áudio]' : '')
        || (m.stickerMessage ? '[Figurinha]' : '')
        || '[Mídia]'
}

function extractType(msg: any): string {
    const m = msg.message || {}
    if (m.imageMessage) return 'image'
    if (m.videoMessage) return 'video'
    if (m.audioMessage || m.pttMessage) return 'audio'
    if (m.documentMessage) return 'document'
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
            results[inbox.name] = { skipped: true, reason: inbox.status }
            continue
        }

        try {
            const chats = await evolutionFetch(`/chat/findChats/${inbox.instanceName}`, {
                method: 'POST', body: JSON.stringify({})
            })
            const records = Array.isArray(chats) ? chats : (chats?.records || [])
            const active = records.filter((c: any) => c.remoteJid && c.remoteJid.includes('@')).slice(0, 500)

            let synced = 0, errors = 0

            for (const chat of active) {
                const remoteJid = chat.remoteJid
                try {
                    const msgsRes = await evolutionFetch(`/chat/findMessages/${inbox.instanceName}`, {
                        method: 'POST',
                        body: JSON.stringify({ where: { key: { remoteJid } } })
                    })

                    let msgs: any[] = []
                    if (msgsRes?.messages?.records) msgs = msgsRes.messages.records
                    else if (Array.isArray(msgsRes)) msgs = msgsRes
                    else if (Array.isArray(msgsRes?.records)) msgs = msgsRes.records
                    if (msgs.length === 0) continue

                    // Upsert Contact
                    let contact = await prisma.contact.findFirst({ where: { phone: remoteJid, accountId: inbox.accountId } })
                    if (!contact) {
                        contact = await prisma.contact.create({
                            data: { accountId: inbox.accountId, name: chat.pushName || remoteJid, phone: remoteJid }
                        })
                    } else if (chat.pushName && chat.pushName !== contact.name && !chat.pushName.includes('@')) {
                        await prisma.contact.update({ where: { id: contact.id }, data: { name: chat.pushName } })
                    }

                    // Upsert Conversation
                    let conversation = await prisma.conversation.findUnique({
                        where: { whatsappJid_inboxId: { whatsappJid: remoteJid, inboxId: inbox.id } }
                    })
                    if (!conversation) {
                        conversation = await prisma.conversation.create({
                            data: {
                                accountId: inbox.accountId,
                                contactId: contact.id,
                                inboxId: inbox.id,
                                whatsappJid: remoteJid,
                                status: 'OPEN',
                                unreadCount: 0
                            }
                        })
                    }

                    // Upsert Messages
                    for (const msg of msgs) {
                        const messageId = msg.key?.id
                        if (!messageId) continue
                        const fromMe = msg.key?.fromMe === true
                        const m = msg.message || {}
                        const fileUrl = m.imageMessage?.url || m.videoMessage?.url || m.documentMessage?.url || m.audioMessage?.url || null
                        const fileName = m.documentMessage?.fileName || null
                        try {
                            await prisma.message.upsert({
                                where: { id: messageId },
                                create: {
                                    id: messageId,
                                    whatsappId: messageId,
                                    whatsappJid: remoteJid,
                                    content: extractContent(msg),
                                    type: extractType(msg),
                                    fromMe,
                                    isRead: true,
                                    sender: fromMe ? 'AGENT' : 'CONTACT',
                                    senderName: fromMe ? null : (msg.pushName || null),
                                    fileUrl,
                                    fileName,
                                    conversationId: conversation.id,
                                    inboxId: inbox.id
                                },
                                update: {}
                            })
                        } catch { /* ignore duplicate */ }
                    }
                    synced++
                } catch (e) {
                    errors++
                }
            }

            const msgCount = await prisma.message.count({ where: { inboxId: inbox.id } })
            const convoCount = await prisma.conversation.count({ where: { inboxId: inbox.id } })
            results[inbox.name] = { synced, errors, messages: msgCount, conversations: convoCount }
        } catch (e: any) {
            results[inbox.name] = { error: e.message }
        }
    }

    return NextResponse.json({ success: true, results })
}
