import { getChats, getMessages, getGroups, getContacts, formatPhoneNumber, isGroupJid, isLidJid } from '@/lib/evolution'
import { getAllLidMappings, loadLidMap } from '@/lib/lid-map'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function isValidChat(jid: string): boolean {
    if (!jid) return false
    if (jid === 'status@broadcast') return false
    if (jid === '0@s.whatsapp.net') return false
    if (jid.endsWith('@broadcast')) return false
    // sometimes Evolution returns group aliases, keep only standard nodes
    return jid.endsWith('@s.whatsapp.net') || jid.endsWith('@g.us') || jid.endsWith('@lid')
}

function formatBrazilPhone(phone: string): string {
    if (phone.startsWith('55') && phone.length >= 12) {
        const ddd = phone.substring(2, 4)
        const num = phone.substring(4)
        if (num.length === 9) return `(${ddd}) ${num.substring(0, 5)}-${num.substring(5)}`
        if (num.length === 8) return `(${ddd}) ${num.substring(0, 4)}-${num.substring(4)}`
    }
    return `+${phone}`
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const action = searchParams.get('action')

        switch (action) {
            case 'chats': {
                // Fetch chats, groups, contacts, LID mappings, and Prisma DB cache in parallel
                const [rawChats, groups, contacts, _lidLoad, dbConversations, dbContacts] = await Promise.all([
                    getChats(),
                    getGroups().catch(() => []),
                    getContacts().catch(() => []),
                    loadLidMap().catch(() => ({})),
                    prisma.conversation.findMany({ select: { whatsappJid: true, unreadCount: true } }).catch(() => []),
                    prisma.contact.findMany({ select: { phone: true, avatarUrl: true } }).catch(() => [])
                ])

                const dbUnreadMap = new Map<string, number>()
                for (const conv of dbConversations) {
                    if (conv.whatsappJid) dbUnreadMap.set(conv.whatsappJid, conv.unreadCount)
                }

                const dbAvatarMap = new Map<string, string>()
                for (const c of dbContacts) {
                    if (c.phone && c.avatarUrl) dbAvatarMap.set(c.phone, c.avatarUrl)
                }

                // Build name maps from contacts and groups
                const contactNameMap = new Map<string, string>()
                const contactPicMap = new Map<string, string>()
                if (Array.isArray(contacts)) {
                    for (const c of contacts) {
                        if (c.remoteJid && c.pushName) {
                            contactNameMap.set(c.remoteJid, c.pushName)
                        }
                        if (c.remoteJid && c.profilePictureUrl) {
                            contactPicMap.set(c.remoteJid, c.profilePictureUrl)
                        }
                    }
                }

                const groupNameMap = new Map<string, string>()
                const groupPicMap = new Map<string, string>()
                if (Array.isArray(groups)) {
                    for (const g of groups) {
                        groupNameMap.set(g.id, g.subject)
                        if (g.profilePictureUrl) {
                            groupPicMap.set(g.id, g.profilePictureUrl)
                        }
                    }
                }

                const lidMap = getAllLidMappings()

                const allChats = (Array.isArray(rawChats) ? rawChats : [])
                    .filter((chat) => isValidChat(chat.remoteJid as string))
                    .map((chat) => {
                        const remoteJid = chat.remoteJid as string
                        const lastMessage = chat.lastMessage as Record<string, unknown> | undefined
                        const lmPushName = lastMessage?.pushName as string | undefined
                        const lmMessage = lastMessage?.message as Record<string, unknown> | undefined
                        const lmTimestamp = lastMessage?.messageTimestamp as number | undefined
                        const lmFromMe = (lastMessage?.key as Record<string, unknown>)?.fromMe as boolean | undefined

                        const isGroup = isGroupJid(remoteJid)
                        const isLid = isLidJid(remoteJid)
                        const phone = formatPhoneNumber(remoteJid)

                        // If LID, try to resolve real phone from mapping
                        let resolvedPhone: string | null = null
                        if (isLid && lidMap[phone]) {
                            resolvedPhone = lidMap[phone]
                        }

                        // Resolve name: LID resolved contact > contacts DB > lastMessage pushName > phone
                        let name = resolvedPhone || phone
                        const lookupJid = resolvedPhone ? `${resolvedPhone}@s.whatsapp.net` : remoteJid
                        if (isGroup) {
                            name = groupNameMap.get(remoteJid) || `Grupo ${phone}`
                        } else if (contactNameMap.has(lookupJid)) {
                            name = contactNameMap.get(lookupJid)!
                        } else if (contactNameMap.has(remoteJid)) {
                            name = contactNameMap.get(remoteJid)!
                        } else if (lmPushName && lmPushName !== 'Você' && lmPushName !== phone) {
                            name = lmPushName
                        } else {
                            // If no name is found, format the phone beautifully instead of showing raw ID
                            if (!isGroup && !isLid) {
                                name = formatBrazilPhone(resolvedPhone || phone)
                            } else if (isLid && !resolvedPhone) {
                                name = `Anônimo (LID)`
                            }
                        }

                        // Last message preview
                        const conv = (lmMessage?.conversation as string) || ''
                        const extText = (lmMessage?.extendedTextMessage as Record<string, unknown>)?.text as string || ''
                        let lastMsgPreview = conv || extText
                        if (!lastMsgPreview && lmMessage?.imageMessage) lastMsgPreview = '📷 Imagem'
                        if (!lastMsgPreview && lmMessage?.audioMessage) lastMsgPreview = '🎵 Áudio'
                        if (!lastMsgPreview && lmMessage?.videoMessage) lastMsgPreview = '🎬 Vídeo'
                        if (!lastMsgPreview && lmMessage?.documentMessage) lastMsgPreview = '📄 Documento'
                        if (!lastMsgPreview && lmMessage?.stickerMessage) lastMsgPreview = '🏷️ Figurinha'
                        if (!lastMsgPreview && lmMessage?.buttonsResponseMessage) lastMsgPreview = '🔘 Resposta de Botão'
                        if (!lastMsgPreview && lmMessage?.listResponseMessage) lastMsgPreview = '📋 Resposta de Lista'
                        if (!lastMsgPreview && lmMessage?.templateButtonReplyMessage) lastMsgPreview = '🔘 Resposta de Template'
                        if (lmFromMe && lastMsgPreview) lastMsgPreview = `Você: ${lastMsgPreview}`

                        const unreadCount = dbUnreadMap.has(remoteJid)
                            ? dbUnreadMap.get(remoteJid)!
                            : ((chat.unreadCount as number) || 0)

                        const profilePicUrl = isGroup
                            ? groupPicMap.get(remoteJid)
                            : (dbAvatarMap.get(lookupJid) || dbAvatarMap.get(remoteJid) || contactPicMap.get(lookupJid) || contactPicMap.get(remoteJid))

                        return {
                            id: remoteJid,
                            name,
                            phone,
                            phoneFormatted: isGroup ? `${(chat as Record<string, unknown>).size || ''} membros` : formatBrazilPhone(resolvedPhone || phone),
                            isGroup,
                            isLid,
                            profilePicUrl,
                            lastMessage: lastMsgPreview.substring(0, 100),
                            lastActivity: chat.updatedAt as string || (
                                lmTimestamp ? new Date(lmTimestamp * 1000).toISOString() : null
                            ),
                            unread: unreadCount,
                        }
                    })
                    .sort((a, b) => {
                        if (!a.lastActivity || !b.lastActivity) return 0
                        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
                    })

                return NextResponse.json(allChats)
            }

            case 'messages': {
                const remoteJid = searchParams.get('jid')
                if (!remoteJid) {
                    return NextResponse.json({ error: 'jid is required' }, { status: 400 })
                }

                // Fetch messages and contacts in parallel for name resolution
                const [rawResult, contacts, lidMap] = await Promise.all([
                    getMessages(remoteJid, 80),
                    getContacts().catch(() => []),
                    loadLidMap().catch(() => ({} as Record<string, string>)),
                ])

                // Build contact name map for sender resolution in groups
                const contactNameMap = new Map<string, string>()
                const contactPicMap = new Map<string, string>()
                if (Array.isArray(contacts)) {
                    for (const c of contacts) {
                        if (c.remoteJid && c.pushName) {
                            contactNameMap.set(c.remoteJid, c.pushName)
                        }
                        if (c.remoteJid && c.profilePictureUrl) {
                            contactPicMap.set(c.remoteJid, c.profilePictureUrl)
                        }
                    }
                }

                let rawMessages: Array<Record<string, unknown>> = []
                if (Array.isArray(rawResult)) {
                    rawMessages = rawResult
                } else if (rawResult && typeof rawResult === 'object') {
                    const obj = rawResult as Record<string, unknown>
                    if (obj.messages && typeof obj.messages === 'object') {
                        const msgs = obj.messages as Record<string, unknown>
                        rawMessages = Array.isArray(msgs.records) ? msgs.records : []
                    }
                }

                const messages = rawMessages
                    .filter(msg => msg.key && msg.message)
                    .map((msg) => {
                        const key = msg.key as { id: string; fromMe: boolean; remoteJid: string; participant?: string }
                        const message = msg.message as Record<string, unknown>

                        // Extract text content
                        const content =
                            (message?.conversation as string) ||
                            ((message?.extendedTextMessage as Record<string, unknown>)?.text as string) ||
                            ((message?.imageMessage as Record<string, unknown>)?.caption as string) ||
                            ((message?.videoMessage as Record<string, unknown>)?.caption as string) ||
                            ((message?.documentMessage as Record<string, unknown>)?.fileName as string) ||
                            ((message?.buttonsResponseMessage as Record<string, unknown>)?.selectedDisplayText as string) ||
                            ((message?.listResponseMessage as Record<string, unknown>)?.title as string) ||
                            ((message?.templateButtonReplyMessage as Record<string, unknown>)?.selectedDisplayText as string) ||
                            ''

                        // Determine media type
                        let type = 'text'
                        let mimetype = ''
                        if (message?.imageMessage) {
                            type = 'image'
                            mimetype = ((message.imageMessage as Record<string, unknown>)?.mimetype as string) || 'image/jpeg'
                        } else if (message?.audioMessage) {
                            type = 'audio'
                            mimetype = ((message.audioMessage as Record<string, unknown>)?.mimetype as string) || 'audio/ogg'
                        } else if (message?.videoMessage) {
                            type = 'video'
                            mimetype = ((message.videoMessage as Record<string, unknown>)?.mimetype as string) || 'video/mp4'
                        } else if (message?.documentMessage) {
                            type = 'document'
                            mimetype = ((message.documentMessage as Record<string, unknown>)?.mimetype as string) || ''
                        } else if (message?.stickerMessage) {
                            type = 'sticker'
                        }

                        // Resolve sender name: participant remoteJid -> contact name -> pushName
                        let senderName = (msg.pushName as string) || null
                        const participant = key.participant || (msg.participant as string)
                        if (participant && contactNameMap.has(participant)) {
                            senderName = contactNameMap.get(participant)!
                        } else if (participant && !senderName) {
                            const pPhone = formatPhoneNumber(participant)
                            const isLid = isLidJid(participant)
                            const resolvedPhone = isLid ? (lidMap[pPhone] || null) : null

                            if (isLid && !resolvedPhone) {
                                senderName = `Anônimo (LID)`
                            } else {
                                senderName = formatBrazilPhone(resolvedPhone || pPhone)
                            }
                        }

                        return {
                            id: key.id,
                            content,
                            type,
                            mimetype,
                            fromMe: key.fromMe,
                            remoteJid: key.remoteJid,
                            timestamp: msg.messageTimestamp
                                ? new Date((msg.messageTimestamp as number) * 1000).toISOString()
                                : null,
                            senderName,
                            senderProfilePicUrl: participant ? contactPicMap.get(participant) : null,
                            hasMedia: ['image', 'audio', 'video', 'document'].includes(type),
                        }
                    })
                    .sort((a, b) => {
                        if (!a.timestamp || !b.timestamp) return 0
                        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                    })

                return NextResponse.json(messages)
            }

            default:
                return NextResponse.json({ error: 'Use action=chats or action=messages&jid=...' }, { status: 400 })
        }
    } catch (error) {
        console.error('WhatsApp API Error:', error)
        return NextResponse.json(
            { error: 'Erro ao conectar com WhatsApp' },
            { status: 500 }
        )
    }
}
