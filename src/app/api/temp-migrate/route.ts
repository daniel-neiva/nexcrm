import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const instanceName = process.env.EVOLUTION_INSTANCE
        if (!instanceName) {
            return NextResponse.json({ error: 'EVOLUTION_INSTANCE not found in ENV' }, { status: 400 })
        }

        const firstAccount = await prisma.account.findFirst()
        if (!firstAccount) {
            return NextResponse.json({ error: 'No account found' }, { status: 404 })
        }

        const inbox = await prisma.inbox.upsert({
            where: { instanceName },
            update: {},
            create: {
                name: 'WhatsApp Principal',
                instanceName,
                status: 'CONNECTED',
                accountId: firstAccount.id
            }
        })

        const updatedConversations = await prisma.conversation.updateMany({
            where: { inboxId: null },
            data: { inboxId: inbox.id }
        })

        const updatedMessages = await prisma.message.updateMany({
            where: { inboxId: null },
            data: { inboxId: inbox.id }
        })

        return NextResponse.json({
            success: true,
            inbox,
            conversations: updatedConversations.count,
            messages: updatedMessages.count
        })
    } catch (error) {
        console.error('Migration error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
