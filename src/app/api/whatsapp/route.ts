import { getChats, getMessages, getGroups, getContacts, formatPhoneNumber, isGroupJid, isLidJid } from '@/lib/evolution'
import { getAllLidMappings, loadLidMap } from '@/lib/lid-map'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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
        const inboxId = searchParams.get('inboxId')

        // Find the specific inbox or the first one if not specified
        let inbox;
        if (inboxId) {
            inbox = await prisma.inbox.findUnique({ where: { id: inboxId } })
        } else {
            inbox = await prisma.inbox.findFirst()
        }

        if (!inbox) {
            return NextResponse.json({ error: 'Nenhuma caixa de entrada configurada' }, { status: 404 })
        }

        const instanceName = inbox.instanceName

        switch (action) {
            case 'chats': {
                // Fetch chats, groups, contacts, LID mappings, and Prisma DB cache in parallel
                const [rawChats, groups, contacts, _lidLoad, dbConversations, dbContacts] = await Promise.all([
                    getChats(instanceName),
                    getGroups(instanceName).catch(() => []),
                    getContacts(instanceName).catch(() => []),
                    loadLidMap().catch(() => ({})),
                    prisma.conversation.findMany({
                        where: { inboxId: inbox.id },
                        select: { whatsappJid: true, unreadCount: true, readOverrideUntil: true }
                    }).catch(() => []),
                    prisma.contact.findMany({
                        where: { accountId: inbox.accountId },
                        select: { phone: true, name: true, avatarUrl: true }
                    }).catch(() => [])
                ])

                const dbUnreadMap = new Map<string, number>()
                const dbUnreadOverrides = new Map<string, boolean>()
                for (const conv of dbConversations) {
                    if (conv.whatsappJid) {
                        dbUnreadMap.set(conv.whatsappJid, conv.unreadCount)
                        if (conv.readOverrideUntil && new Date(conv.readOverrideUntil) > new Date()) {
                            dbUnreadOverrides.set(conv.whatsappJid, true)
                        }
                    }
                }

                const dbAvatarMap = new Map<string, string>()
                const dbNameMap = new Map<string, string>()
                for (const c of dbContacts) {
                    if (c.phone && c.avatarUrl) dbAvatarMap.set(c.phone, c.avatarUrl)
                    if (c.phone && c.name) dbNameMap.set(c.phone, c.name)
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
                        if (isLid) {
                            if (lidMap[phone]) {
                                resolvedPhone = lidMap[phone]
                            } else {
                                const key = lastMessage?.key as Record<string, unknown> | undefined
                                const remoteJidAlt = key?.remoteJidAlt as string | undefined
                                const participantAlt = key?.participantAlt as string | undefined
                                if (remoteJidAlt && remoteJidAlt.includes('@s.whatsapp.net')) {
                                    resolvedPhone = remoteJidAlt.split('@')[0]
                                } else if (participantAlt && participantAlt.includes('@s.whatsapp.net')) {
                                    resolvedPhone = participantAlt.split('@')[0]
                                }
                            }
                        }

                        // Resolve name: DB saved name > LID resolved contact > contacts DB > lastMessage pushName > phone
                        let name = resolvedPhone || phone
                        const lookupJid = resolvedPhone ? `${resolvedPhone}@s.whatsapp.net` : remoteJid
                        const lookupPhone = resolvedPhone || phone

                        if (isGroup) {
                            name = groupNameMap.get(remoteJid) || `Grupo ${phone}`
                        } else if (dbNameMap.has(lookupPhone)) {
                            // Highest priority: name saved in our database
                            name = dbNameMap.get(lookupPhone)!
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
                        const extractedText =
                            (lmMessage?.conversation as string) ||
                            ((lmMessage?.extendedTextMessage as Record<string, unknown>)?.text as string) ||
                            ((lmMessage?.imageMessage as Record<string, unknown>)?.caption as string) ||
                            ((lmMessage?.videoMessage as Record<string, unknown>)?.caption as string) ||
                            ((lmMessage?.documentWithCaptionMessage as any)?.message?.documentMessage?.caption as string) ||
                            ((lmMessage?.documentMessage as Record<string, unknown>)?.fileName as string) ||
                            ((lmMessage?.buttonsResponseMessage as Record<string, unknown>)?.selectedDisplayText as string) ||
                            ((lmMessage?.listResponseMessage as Record<string, unknown>)?.title as string) ||
                            ((lmMessage?.templateButtonReplyMessage as Record<string, unknown>)?.selectedDisplayText as string) ||
                            ((lmMessage?.templateMessage as any)?.interactiveMessageTemplate?.body?.text as string) ||
                            ((lmMessage?.templateMessage as any)?.hydratedTemplate?.bodyText as string) ||
                            ((lmMessage?.templateMessage as any)?.hydratedTemplate?.hydratedContentText as string) ||
                            ((lmMessage?.templateMessage as any)?.hydratedFourRowTemplate?.hydratedContentText as string) ||
                            ((lmMessage?.interactiveMessage as any)?.body?.text as string) ||
                            ((lmMessage?.interactiveMessage as any)?.header?.title as string) ||
                            ((lmMessage?.buttonsMessage as any)?.contentText as string) ||
                            ((lmMessage?.listMessage as any)?.description as string) ||
                            ((lmMessage?.listMessage as any)?.title as string) ||
                            ((lmMessage?.viewOnceMessage as any)?.message?.imageMessage?.caption as string) ||
                            ((lmMessage?.viewOnceMessage as any)?.message?.videoMessage?.caption as string) ||
                            ((lmMessage?.viewOnceMessageV2 as any)?.message?.imageMessage?.caption as string) ||
                            ((lmMessage?.viewOnceMessageV2 as any)?.message?.videoMessage?.caption as string) ||
                            ''

                        let lastMsgPreview = extractedText

                        if (!lastMsgPreview) {
                            if (lmMessage?.imageMessage || (lmMessage?.templateMessage as any)?.interactiveMessageTemplate?.header?.imageMessage || (lmMessage?.templateMessage as any)?.hydratedTemplate?.imageMessage) lastMsgPreview = '📷 Imagem'
                            else if (lmMessage?.audioMessage) lastMsgPreview = '🎵 Áudio'
                            else if (lmMessage?.videoMessage || (lmMessage?.templateMessage as any)?.interactiveMessageTemplate?.header?.videoMessage || (lmMessage?.templateMessage as any)?.hydratedTemplate?.videoMessage) lastMsgPreview = '🎬 Vídeo'
                            else if (lmMessage?.documentMessage || lmMessage?.documentWithCaptionMessage) lastMsgPreview = '📄 Documento'
                            else if (lmMessage?.stickerMessage) lastMsgPreview = '🏷️ Figurinha'
                            else if (lmMessage?.buttonsResponseMessage) lastMsgPreview = '🔘 Resposta de Botão'
                            else if (lmMessage?.listResponseMessage) lastMsgPreview = '📋 Resposta de Lista'
                            else if (lmMessage?.templateButtonReplyMessage) lastMsgPreview = '🔘 Resposta de Template'
                            else if (lmMessage?.templateMessage) lastMsgPreview = '🔘 Template Interativo'
                        }
                        if (lmFromMe && lastMsgPreview) lastMsgPreview = `Você: ${lastMsgPreview}`

                        const isOverride = dbUnreadOverrides.has(remoteJid)
                        const unreadCount = isOverride ? 0 : (
                            dbUnreadMap.has(remoteJid)
                                ? dbUnreadMap.get(remoteJid)!
                                : ((chat.unreadCount as number) || 0)
                        )

                        const profilePicUrl = isGroup
                            ? (groupPicMap.get(remoteJid) || dbAvatarMap.get(remoteJid))
                            : (dbAvatarMap.get(lookupJid) || dbAvatarMap.get(remoteJid) || contactPicMap.get(lookupJid) || contactPicMap.get(remoteJid))

                        return {
                            id: remoteJid,
                            name,
                            phone,
                            phoneFormatted: isGroup ? `${(chat as Record<string, unknown>).size || ''} membros` : formatBrazilPhone(resolvedPhone || phone),
                            isGroup,
                            isLid,
                            profilePicUrl,
                            inboxId: inbox.id,
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

            case 'conversation': {
                const jid = searchParams.get('jid')
                if (!jid) return NextResponse.json({ error: 'jid required' }, { status: 400 })
                const conv = await prisma.conversation.findFirst({
                    where: {
                        whatsappJid: jid,
                        inboxId: inbox.id
                    },
                    select: { id: true, agentId: true, aiEnabled: true, assigneeId: true }
                })
                return NextResponse.json(conv || {})
            }

            case 'messages': {
                const remoteJid = searchParams.get('jid')
                if (!remoteJid) {
                    return NextResponse.json({ error: 'jid is required' }, { status: 400 })
                }

                // 1. Find the conversation in our database to get its ID
                const conversation = await prisma.conversation.findFirst({
                    where: {
                        whatsappJid: remoteJid,
                        inboxId: inbox.id
                    }
                })

                if (!conversation) {
                    // No local conversation means no messages yet
                    return NextResponse.json([])
                }

                // 2. Fetch messages from our database
                const dbMessages = await prisma.message.findMany({
                    where: { conversationId: conversation.id },
                    orderBy: { createdAt: 'asc' }
                })

                // 3. Fetch contacts for name resolution (especially for groups)
                const dbContacts = await prisma.contact.findMany({
                    where: { accountId: inbox.accountId },
                    select: { phone: true, name: true, avatarUrl: true }
                })

                const contactNameMap = new Map<string, string>()
                const contactPicMap = new Map<string, string>()
                for (const c of dbContacts) {
                    if (c.phone) {
                        if (c.name) contactNameMap.set(c.phone, c.name)
                        if (c.avatarUrl) contactPicMap.set(c.phone, c.avatarUrl)
                    }
                }

                // 4. Map DB messages to the frontend expected format
                const formattedMessages = dbMessages.map(msg => {
                    let senderName = msg.senderName || null;
                    let senderProfilePicUrl = null;

                    if (!msg.fromMe && msg.whatsappJid) {
                        const lookupPhone = msg.whatsappJid.split('@')[0].replace('+', '');
                        senderName = msg.senderName || contactNameMap.get(lookupPhone) || formatBrazilPhone(lookupPhone);
                        senderProfilePicUrl = contactPicMap.get(lookupPhone) || null;
                    }

                    return {
                        id: msg.id,
                        content: msg.content || '',
                        type: msg.type,
                        mimetype: msg.type === 'image' ? 'image/jpeg' : (msg.type === 'video' ? 'video/mp4' : (msg.type === 'audio' ? 'audio/ogg' : '')),
                        fromMe: msg.fromMe,
                        remoteJid: remoteJid, // Send back the requested JID context
                        timestamp: msg.createdAt ? msg.createdAt.toISOString() : null,
                        senderName,
                        senderProfilePicUrl,
                        hasMedia: ['image', 'audio', 'video', 'document', 'sticker'].includes(msg.type),
                        isRead: msg.isRead || msg.fromMe,
                    }
                });

                return NextResponse.json(formattedMessages)
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
