import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const { remoteJid, inboxId } = await req.json()
        if (!remoteJid) return NextResponse.json({ error: 'Missing remoteJid' }, { status: 400 })

        // Find the specific inbox
        let inbox;
        if (inboxId) {
            inbox = await prisma.inbox.findUnique({ where: { id: inboxId }, include: { account: true } })
        } else {
            inbox = await prisma.inbox.findFirst({ include: { account: true } })
        }

        if (!inbox) {
            return NextResponse.json({ error: 'Nenhuma caixa de entrada configurada' }, { status: 404 })
        }

        const account = inbox.account
        const instanceName = inbox.instanceName

        // 1. Reset unread count directly in Prisma (CRM side)
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
            where: {
                whatsappJid: remoteJid,
                inboxId: inbox.id
            },
            update: {
                unreadCount: 0,
                readOverrideUntil: overrideUntil
            },
            create: {
                whatsappJid: remoteJid,
                inboxId: inbox.id,
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
                inboxId: inbox.id,
                isRead: false,
                fromMe: false
            },
            select: { whatsappId: true },
            orderBy: { createdAt: 'desc' },
            take: 1
        })

        if (unreadMessages.length > 0) {
            await prisma.message.updateMany({
                where: {
                    whatsappJid: remoteJid,
                    inboxId: inbox.id,
                    isRead: false
                },
                data: { isRead: true }
            })
        }

        // 2. Call Evolution API
        const API_KEY = process.env.EVOLUTION_API_KEY
        const API_URL = process.env.EVOLUTION_API_URL

        if (instanceName && API_KEY && API_URL) {
            let finalPayloadMessages: any[] = [];

            if (unreadMessages.length > 0) {
                for (const m of unreadMessages) {
                    const wid = m.whatsappId;
                    if (!wid) continue;

                    let participant = undefined;
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

                                if (pAlt && pAlt.includes('@s.whatsapp.net')) {
                                    participant = pAlt;
                                } else if (p1 && p1.includes('@s.whatsapp.net')) {
                                    participant = p1;
                                } else {
                                    participant = p1 || pAlt;
                                }
                            }
                        } catch (e) {
                            console.error('[Mark As Read] Failed to extract participant', e);
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
                try {
                    const res = await fetch(`${API_URL}/chat/findMessages/${instanceName}`, {
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

            if (finalPayloadMessages.length > 0) {
                const readPayload = { readMessages: finalPayloadMessages };
                await fetch(`${API_URL}/chat/markMessageAsRead/${instanceName}`, {
                    method: 'POST',
                    headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify(readPayload)
                })
            }
        }

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error('[Mark As Read] Error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

