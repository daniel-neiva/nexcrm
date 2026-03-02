import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const inbox = await prisma.inbox.findFirst({ where: { instanceName: 'daniel-comercial' } });

        // Check 1: The conversation for 'Piselli'
        const conversations = await prisma.conversation.findMany({
            where: {
                inboxId: inbox?.id,
                whatsappJid: '120363280409766321@g.us'
            },
            include: {
                _count: { select: { messages: true } },
                messages: { orderBy: { createdAt: 'desc' }, take: 10 }
            }
        });

        // Check 2: Raw Webhooks recently ingested
        const recentWebhooks = await prisma.whatsappEventRaw.findMany({
            orderBy: { receivedAt: 'desc' },
            take: 5,
            select: { id: true, eventType: true, receivedAt: true, processed: true, error: true }
        });

        return NextResponse.json({
            inboxId: inbox?.id,
            piselliChat: conversations[0],
            recentWebhooks
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
