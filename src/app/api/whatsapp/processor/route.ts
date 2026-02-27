import { NextRequest, NextResponse, after } from 'next/server'
import { getProfilePicture, getChats, sendTextMessage, markAsRead } from '@/lib/evolution'
import { setLidPhone } from '@/lib/lid-map'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { prisma } from '@/lib/prisma'
import { processAgentMessage } from '@/lib/ai/orchestrator'
import { routeToAgent } from '@/lib/ai/router'

/**
 * Background Processor for Evolution API events stored in WhatsappEventRaw.
 * Triggered by Supabase Postgres Database Webhook on INSERT.
 */
export async function POST(request: NextRequest) {
    let rawId: string | undefined;

    try {
        const body = await request.json()

        // Verify it's a Supabase Database Webhook for our raw events table
        if (body.type !== 'INSERT' || body.table !== 'WhatsappEventRaw') {
            return NextResponse.json({ status: 'ignored' })
        }

        const rawEvent = body.record
        if (!rawEvent || rawEvent.processed) {
            return NextResponse.json({ status: 'already processed' })
        }

        rawId = rawEvent.id;

        const event = rawEvent.eventType || ''
        const payload = rawEvent.payload || {}
        const data = payload.data || payload

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
                const m = msg.message || {}

                // Determine message content
                let content = Object.values(m || {}).length === 0 ? '' : (
                    (m?.conversation as string) ||
                    ((m?.extendedTextMessage as Record<string, unknown>)?.text as string) ||
                    ((m?.imageMessage as Record<string, unknown>)?.caption as string) ||
                    ((m?.videoMessage as Record<string, unknown>)?.caption as string) ||
                    ((m?.documentWithCaptionMessage as any)?.message?.documentMessage?.caption as string) ||
                    ((m?.documentMessage as Record<string, unknown>)?.fileName as string) ||
                    ((m?.buttonsResponseMessage as Record<string, unknown>)?.selectedDisplayText as string) ||
                    ((m?.listResponseMessage as Record<string, unknown>)?.title as string) ||
                    ((m?.templateButtonReplyMessage as Record<string, unknown>)?.selectedDisplayText as string) ||
                    ((m?.templateMessage as any)?.interactiveMessageTemplate?.body?.text as string) ||
                    ((m?.templateMessage as any)?.hydratedTemplate?.bodyText as string) ||
                    ((m?.templateMessage as any)?.hydratedTemplate?.hydratedContentText as string) ||
                    ((m?.templateMessage as any)?.hydratedFourRowTemplate?.hydratedContentText as string) ||
                    ((m?.interactiveMessage as any)?.body?.text as string) ||
                    ((m?.interactiveMessage as any)?.header?.title as string) ||
                    ((m?.buttonsMessage as any)?.contentText as string) ||
                    ((m?.listMessage as any)?.description as string) ||
                    ((m?.listMessage as any)?.title as string) ||
                    ((m?.viewOnceMessage as any)?.message?.imageMessage?.caption as string) ||
                    ((m?.viewOnceMessage as any)?.message?.videoMessage?.caption as string) ||
                    ((m?.viewOnceMessageV2 as any)?.message?.imageMessage?.caption as string) ||
                    ((m?.viewOnceMessageV2 as any)?.message?.videoMessage?.caption as string) ||
                    ''
                )

                let type = 'text'
                let hasMedia = false

                const imgNode = m?.imageMessage || (m?.viewOnceMessage as any)?.message?.imageMessage || (m?.viewOnceMessageV2 as any)?.message?.imageMessage || (m?.templateMessage as any)?.interactiveMessageTemplate?.header?.imageMessage || (m?.templateMessage as any)?.hydratedTemplate?.imageMessage
                const vidNode = m?.videoMessage || (m?.viewOnceMessage as any)?.message?.videoMessage || (m?.viewOnceMessageV2 as any)?.message?.videoMessage || (m?.templateMessage as any)?.interactiveMessageTemplate?.header?.videoMessage || (m?.templateMessage as any)?.hydratedTemplate?.videoMessage
                const docNode = m?.documentMessage || (m?.documentWithCaptionMessage as any)?.message?.documentMessage || (m?.templateMessage as any)?.interactiveMessageTemplate?.header?.documentMessage || (m?.templateMessage as any)?.hydratedTemplate?.documentMessage

                if (imgNode) {
                    type = 'image'
                    hasMedia = true
                    if (!content) content = '📷 Imagem'
                } else if (vidNode) {
                    type = 'video'
                    hasMedia = true
                    if (!content) content = '🎬 Vídeo'
                } else if (m?.audioMessage) {
                    type = 'audio'
                    hasMedia = true
                    if (!content) content = '🎵 Áudio'
                } else if (docNode) {
                    type = 'document'
                    hasMedia = true
                    if (!content) content = '📄 Documento'
                } else if (m?.stickerMessage) {
                    type = 'sticker'
                    hasMedia = true
                    if (!content) content = '🏷️ Figurinha'
                }

                // If no text, and no standard media is identified, skip or save generic
                if (!content && !hasMedia) {
                    content = 'Mensagem de sistema ou mídia não suportada'
                }

                // We need an Account ID and Contact ID to save in Prisma CRM structure
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
                    let avatarUrl = null;
                    try {
                        const picData = await getProfilePicture(remoteJid);
                        if (picData?.profilePictureUrl) {
                            avatarUrl = picData.profilePictureUrl;
                        }
                    } catch (e) {
                        console.log(`[Processor] Could not fetch avatar for ${remoteJid}`);
                    }

                    contact = await prisma.contact.create({
                        data: {
                            accountId: account.id,
                            name: pushName || remoteJid,
                            phone: remoteJid,
                            avatarUrl: avatarUrl
                        }
                    })
                } else if (!contact.avatarUrl) {
                    // Try to backfill missing avatars on existing contacts when they message us
                    try {
                        const picData = await getProfilePicture(remoteJid);
                        if (picData?.profilePictureUrl) {
                            contact = await prisma.contact.update({
                                where: { id: contact.id },
                                data: { avatarUrl: picData.profilePictureUrl }
                            });
                        }
                    } catch (e) {
                        // Ignore
                    }
                }

                // Upsert Conversation
                let conversation = await prisma.conversation.findUnique({
                    where: { whatsappJid: remoteJid },
                    select: {
                        id: true,
                        whatsappJid: true,
                        accountId: true,
                        contactId: true,
                        unreadCount: true,
                        aiEnabled: true,
                        agentId: true
                    }
                })

                if (!conversation) {
                    conversation = await prisma.conversation.create({
                        data: {
                            whatsappJid: remoteJid,
                            accountId: account.id,
                            contactId: contact.id,
                            channel: 'WHATSAPP',
                            status: 'OPEN',
                            unreadCount: fromMe ? 0 : 1,
                            aiEnabled: true
                        },
                        select: {
                            id: true,
                            whatsappJid: true,
                            accountId: true,
                            contactId: true,
                            unreadCount: true,
                            aiEnabled: true,
                            agentId: true
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

                // Mark incoming message as read in WhatsApp (shows blue ✓✓ to the lead)
                if (!fromMe && messageId) {
                    markAsRead(remoteJid, [messageId]).catch(() => {
                        // Non-critical: don't fail the pipeline if mark-as-read fails
                    })
                }

                // Check for /reset command (can be sent from either side to clear memory)
                if (content.trim().toLowerCase() === '/reset') {
                    console.log(`[Processor] Reset command detected for conversation ${conversation.id}`)

                    // Call the reset logic directly via Prisma (since we're already on the server)
                    await prisma.message.deleteMany({
                        where: { conversationId: conversation.id }
                    })

                    // Reset unread count
                    await prisma.conversation.update({
                        where: { id: conversation.id },
                        data: { unreadCount: 0 }
                    })

                    // Notify CRM UI to clear messages
                    await supabaseAdmin.channel('whatsapp_updates').send({
                        type: 'broadcast',
                        event: 'messages_cleared',
                        payload: { conversationId: conversation.id, remoteJid }
                    })

                    // Confirmation message
                    if (!fromMe) {
                        await sendTextMessage(remoteJid, "🗑️ *Memória limpa!* Começando do zero.")
                    }

                    return NextResponse.json({ status: 'reset' })
                }

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
                            hasMedia: ['image', 'video', 'audio', 'document', 'sticker'].includes(savedMessage.type),
                            isRead: savedMessage.isRead,
                        },
                        chat: {
                            id: conversation.whatsappJid,
                            unreadCount: conversation.unreadCount
                        }
                    }
                })

                // ===== AI AUTO-RESPONSE (with intelligent routing) =====
                // Only trigger for incoming, non-group, text-based messages
                const isGroup = remoteJid.includes('@g.us')
                const isTextBased = type === 'text' && content.length > 0

                if (!fromMe && !isGroup && isTextBased && conversation.aiEnabled) {
                    // Capture snapshot of variables needed inside after()
                    const _conversationId = conversation.id
                    const _agentId = conversation.agentId ?? null
                    const _accountId = account.id
                    const _content = content
                    const _remoteJid = remoteJid

                    // after() tells Vercel to keep this serverless function alive
                    // AFTER the HTTP response is sent, so the GPT call can complete.
                    // Without this, Vercel kills the process before the AI responds.
                    after(async () => {
                        try {
                            let agentId = _agentId

                            // ── ROUTING PHASE ──────────────────────────────────────────
                            // If no agent is assigned yet, use the AI Router to pick one
                            if (!agentId) {
                                console.log(`[Processor] New conversation — routing lead to best agent...`)
                                agentId = await routeToAgent(_accountId, _content)

                                if (agentId) {
                                    // Persist the agent assignment so future messages skip routing
                                    await prisma.conversation.update({
                                        where: { id: _conversationId },
                                        data: { agentId, aiEnabled: true }
                                    })

                                    // Notify the CRM UI that the agent was auto-assigned
                                    await supabaseAdmin.channel('whatsapp_updates').send({
                                        type: 'broadcast',
                                        event: 'agent_assigned',
                                        payload: { conversationId: _conversationId, agentId, jid: _remoteJid }
                                    })

                                    console.log(`[Processor] AI Router assigned agent ${agentId} to conversation ${_conversationId}`)
                                }
                            }

                            if (!agentId) {
                                console.log(`[Processor] No active agent found — skipping AI response.`)
                                return
                            }

                            // ── RESPONSE PHASE ─────────────────────────────────────────
                            const activeAgent = await prisma.agent.findUnique({
                                where: { id: agentId },
                                select: { id: true, name: true, isActive: true }
                            })

                            if (!activeAgent?.isActive) {
                                console.log(`[Processor] Agent ${agentId} is inactive — skipping.`)
                                return
                            }

                            console.log(`[Processor] Agent "${activeAgent.name}" responding to ${_remoteJid}`)

                            // Call orchestrator: build full system prompt, call gpt-4o-mini, save AI message to DB
                            const { content: aiResponse } = await processAgentMessage(
                                activeAgent.id,
                                _conversationId,
                                _content
                            )

                            // Send response via Evolution API (WhatsApp)
                            await sendTextMessage(_remoteJid, aiResponse)

                            // Broadcast AI message to CRM chat UI in real-time
                            await supabaseAdmin.channel('whatsapp_updates').send({
                                type: 'broadcast',
                                event: 'new_message',
                                payload: {
                                    message: {
                                        id: `ai_${Date.now()}`,
                                        content: aiResponse,
                                        type: 'text',
                                        fromMe: true,
                                        remoteJid: _remoteJid,
                                        timestamp: new Date().toISOString(),
                                        senderName: activeAgent.name,
                                        hasMedia: false,
                                        isRead: true,
                                    },
                                    chat: { id: _remoteJid, unreadCount: 0 }
                                }
                            })

                            console.log(`[Processor] AI response sent successfully to ${_remoteJid}`)

                        } catch (err) {
                            console.error(`[Processor] AI pipeline failed:`, err)
                        }
                    })
                }
                // ===== END AI AUTO-RESPONSE =====
            }

            // Sync Read Receipts from Mobile to CRM
            if (event === 'messages.update') {
                const status = msg.status || ''
                const msgFromMe = msg.fromMe === true;
                const remoteJid = msg.key?.remoteJid || msg.remoteJid || '';
                const isGroup = remoteJid.includes('@g.us') || remoteJid.includes('@lid');

                // WhatsApp group read receipts don't fire "READ" easily.
                // If the user reads a group on their phone, it might fire SERVER_ACK/DELIVERY_ACK with fromMe: true
                const isReadExplicit = status === 'READ' || status === 3 || status === 4;
                const isGroupReadImplicit = isGroup && msgFromMe && (status === 'SERVER_ACK' || status === 'DELIVERY_ACK');

                if (isReadExplicit || isGroupReadImplicit) {
                    const updateMsgId = msg.key?.id || msg.keyId || msg.messageId || '';
                    let realJidToClear = '';

                    if (updateMsgId) {
                        const existingMsg = await prisma.message.findUnique({
                            where: { whatsappId: updateMsgId },
                            select: { whatsappJid: true }
                        });
                        if (existingMsg && existingMsg.whatsappJid) realJidToClear = existingMsg.whatsappJid;
                    }

                    // Fallback to the remoteJid if message wasn't found but we know it's a group read
                    if (!realJidToClear && isGroupReadImplicit && remoteJid) {
                        realJidToClear = remoteJid;
                        // Evolution sometimes sends :48@lid, trim it down to base JID if needed
                        if (realJidToClear.includes(':')) {
                            realJidToClear = realJidToClear.split(':')[0] + '@lid';
                        }
                    }

                    if (realJidToClear) {
                        // Update database
                        await prisma.conversation.updateMany({
                            where: { whatsappJid: realJidToClear },
                            data: { unreadCount: 0 }
                        })

                        await prisma.message.updateMany({
                            where: { whatsappJid: realJidToClear, isRead: false },
                            data: { isRead: true }
                        })

                        // Broadcast read status to CRM UI so ticks turn blue in real-time
                        await supabaseAdmin.channel('whatsapp_updates').send({
                            type: 'broadcast',
                            event: 'message_status_update',
                            payload: {
                                remoteJid: realJidToClear,
                                messageId: updateMsgId,
                                isRead: true
                            }
                        })

                        // Broadcast read event to clients
                        await supabaseAdmin.channel('whatsapp_updates').send({
                            type: 'broadcast',
                            event: 'read_receipt',
                            payload: {
                                chat: { id: realJidToClear, unreadCount: 0 }
                            }
                        })
                    }
                }
            }

            // Sync Unread Count changes (e.g., when the user reads a chat on their phone)
            if (event === 'chats.update' || event === 'chats.upsert') {
                const unreadCount = msg.unreadCount;
                const chatJid = msg.id || msg.remoteJid || msg.key?.remoteJid;

                if (chatJid) {
                    let finalUnreadCount = unreadCount;

                    // If Evolution stripped the unreadCount from chats.update, fetch it live
                    if (finalUnreadCount === undefined) {
                        try {
                            const allChats = await getChats();
                            if (Array.isArray(allChats)) {
                                const targetChat = allChats.find(c => c.id === chatJid || c.remoteJid === chatJid);
                                if (targetChat) {
                                    finalUnreadCount = targetChat.unreadCount;
                                }
                            }
                        } catch (e) {
                            console.log('[Processor] Failed to fetch live chat state for unread count', e);
                        }
                    }

                    if (finalUnreadCount !== undefined) {
                        const existingConv = await prisma.conversation.findUnique({
                            where: { whatsappJid: chatJid },
                            select: { readOverrideUntil: true }
                        });

                        const isOverride = existingConv?.readOverrideUntil && new Date(existingConv.readOverrideUntil) > new Date();

                        if (!isOverride) {
                            await prisma.conversation.updateMany({
                                where: { whatsappJid: chatJid },
                                data: { unreadCount: Number(finalUnreadCount) }
                            });
                        }

                        // If read completely, mark all associated unread messages as read
                        if (Number(finalUnreadCount) === 0) {
                            await prisma.message.updateMany({
                                where: { whatsappJid: chatJid, isRead: false },
                                data: { isRead: true }
                            });
                        }

                        // Broadcast to UI to clear read bubbles
                        await supabaseAdmin.channel('whatsapp_updates').send({
                            type: 'broadcast',
                            event: 'read_receipt',
                            payload: {
                                chat: { id: chatJid, unreadCount: Number(finalUnreadCount) }
                            }
                        });
                    }

                    // Let's also backfill group avatars just in case the initial creation missed it
                    if (chatJid.includes('@g.us') || chatJid.includes('@lid')) {
                        const existingContact = await prisma.contact.findFirst({
                            where: { phone: chatJid }
                        });
                        if (existingContact && !existingContact.avatarUrl) {
                            try {
                                const picData = await getProfilePicture(chatJid);
                                if (picData?.profilePictureUrl) {
                                    await prisma.contact.update({
                                        where: { id: existingContact.id },
                                        data: { avatarUrl: picData.profilePictureUrl }
                                    });
                                }
                            } catch (e) {
                                // Ignore
                            }
                        }
                    }
                }
            }
        }

        // Mark event as processed cleanly
        if (rawId) {
            await prisma.whatsappEventRaw.update({
                where: { id: rawId },
                data: { processed: true, processedAt: new Date() }
            })
            console.log(`[Processor] Fully processed raw event: ${rawId}`)
        }

        return NextResponse.json({ status: 'ok' })
    } catch (error: any) {
        console.error('[Processor] Fatal Error:', error)

        // If we extracted the ID and it failed midway, try to log the error back to DB
        if (rawId) {
            try {
                await prisma.whatsappEventRaw.update({
                    where: { id: rawId },
                    data: { error: String(error?.message || error) }
                })
            } catch (e) {
                // Ignore fallback error
            }
        }

        // We throw 500 so Supabase webhook triggers a retry mechanism if configured
        return NextResponse.json({ status: 'error', message: error?.message || 'Unknown' }, { status: 500 })
    }
}
