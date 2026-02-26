import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const { remoteJid } = await req.json()
        if (!remoteJid) return NextResponse.json({ error: 'Missing remoteJid' }, { status: 400 })

        // We need the default account ID for Prisma creation
        let account = await prisma.account.findFirst()
        if (!account) {
            account = await prisma.account.create({
                data: { name: 'Conta Principal', plan: 'pro' }
            })
        }

        // 1. Reset unread count directly in Prisma (CRM side)
        // For Legacy chats, we might need to create a stub contact first
        let contact = await prisma.contact.findFirst({
            where: { phone: remoteJid, accountId: account.id }
        })
        if (!contact) {
            contact = await prisma.contact.create({
                data: {
                    accountId: account.id,
                    name: remoteJid.includes('@') ? remoteJid.split('@')[0] : remoteJid,
                    phone: remoteJid
                }
            })
        }

        const overrideUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes override

        await prisma.conversation.upsert({
            where: { whatsappJid: remoteJid },
            update: {
                unreadCount: 0,
                readOverrideUntil: overrideUntil
            },
            create: {
                whatsappJid: remoteJid,
                unreadCount: 0,
                accountId: account.id,
                contactId: contact.id,
                readOverrideUntil: overrideUntil
            }
        })

        // Fetch the unread messages for this chat to sync with WhatsApp
        const unreadMessages = await prisma.message.findMany({
            where: {
                whatsappJid: remoteJid,
                isRead: false,
                fromMe: false
            },
            select: { whatsappId: true },
            orderBy: { createdAt: 'desc' }, // Order by newest first
            take: 1 // Only the last message is needed to mark the whole chat as read up to that point
        })

        // We proceed even if unreadMessages.length is 0 because of Legacy chats.
        if (unreadMessages.length > 0) {
            // Mark as read internally
            await prisma.message.updateMany({
                where: { whatsappJid: remoteJid, isRead: false },
                data: { isRead: true }
            })
        }

        // 2. Call Evolution API to push the "blue ticks" to the client's phone
        const INSTANCE = process.env.EVOLUTION_INSTANCE
        const API_KEY = process.env.EVOLUTION_API_KEY
        const API_URL = process.env.EVOLUTION_API_URL

        if (INSTANCE && API_KEY && API_URL) {
            let finalPayloadMessages: any[] = [];

            if (unreadMessages.length > 0) {
                for (const m of unreadMessages) {
                    const wid = m.whatsappId;
                    if (!wid) continue;

                    let participant = undefined;
                    // For groups/LIDs, Evolution REQUIRES the participant ID to mark as read
                    if (remoteJid.includes('@g.us') || remoteJid.includes('@lid')) {
                        try {
                            const raw = await prisma.whatsappEventRaw.findFirst({
                                where: { eventKey: { contains: wid } },
                                select: { payload: true }
                            });
                            if (raw && raw.payload) {
                                const p = raw.payload as any;
                                const p1 = p?.data?.key?.participant || p?.message?.key?.participant;
                                const pAlt = p?.data?.key?.participantAlt || p?.message?.key?.participantAlt;

                                // WhatsApp Web often ignores reads sent with @lid, so we prioritize the @s.whatsapp.net alias if it exists
                                if (pAlt && pAlt.includes('@s.whatsapp.net')) {
                                    participant = pAlt;
                                } else if (p1 && p1.includes('@s.whatsapp.net')) {
                                    participant = p1;
                                } else {
                                    participant = p1 || pAlt;
                                }
                            }
                        } catch (e) {
                            console.error('[Mark As Read] Failed to extract participant for group message', e);
                        }
                    }

                    finalPayloadMessages.push({
                        remoteJid,
                        fromMe: false,
                        id: wid,
                        ...(participant ? { participant } : {})
                    });
                }
            } else {
                // Legacy Flow: The CRM has no record of these unread messages, but the UI wants to clear them.
                // We must ask Evolution for the absolute latest message in this chat to send the 'read' command for it.
                try {
                    console.log(`[Mark As Read] Legacy Chat detected. Fetching latest remote message for ${remoteJid}...`);
                    const res = await fetch(`${API_URL}/chat/findMessages/${INSTANCE}`, {
                        method: 'POST',
                        headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ where: { remoteJid }, limit: 1 })
                    });
                    const resData = await res.json();
                    const latestKey = resData?.messages?.records?.[0]?.key;
                    if (latestKey) {
                        let participant = latestKey.participant || latestKey.participantAlt;
                        if (latestKey.participantAlt?.includes('@s.whatsapp.net')) participant = latestKey.participantAlt;
                        else if (latestKey.participant?.includes('@s.whatsapp.net')) participant = latestKey.participant;

                        finalPayloadMessages.push({
                            remoteJid,
                            fromMe: false,
                            id: latestKey.id,
                            ...(participant ? { participant } : {})
                        });
                    }
                } catch (e) {
                    console.error('[Mark As Read] Failed to fetch remote legacy message', e);
                }
            }

            if (finalPayloadMessages.length === 0) {
                return NextResponse.json({ success: true, warning: 'No valid whatsappId found to mark as read remotely' });
            }

            const readPayload = { readMessages: finalPayloadMessages };

            console.log(`[Mark As Read] Sending payload to Evolution: ${JSON.stringify(readPayload)}`)

            const evoRes = await fetch(`${API_URL}/chat/markMessageAsRead/${INSTANCE}`, {
                method: 'POST',
                headers: {
                    'apikey': API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(readPayload)
            })

            if (!evoRes.ok) {
                const errorText = await evoRes.text()
                console.log('[Evolution API] Mark as read successful')
            }
        }

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error('[Mark As Read] Error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
