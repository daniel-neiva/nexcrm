import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/conversations/[id]/reset
 * Clears all messages from a conversation so the AI bot starts fresh.
 * The WhatsApp history on the device is unaffected.
 */
export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        if (!id) {
            return NextResponse.json({ error: 'Missing conversation id' }, { status: 400 })
        }

        // Delete all messages for this conversation
        const { count } = await prisma.message.deleteMany({
            where: { conversationId: id }
        })

        // Also reset the unread count
        await prisma.conversation.update({
            where: { id },
            data: { unreadCount: 0 }
        }).catch(() => { }) // ignore if conversation doesn't exist

        console.log(`[Reset] Cleared ${count} messages from conversation ${id}`)

        return NextResponse.json({ status: 'ok', deletedMessages: count })
    } catch (error) {
        console.error('[Reset] Error:', error)
        return NextResponse.json({ error: 'Failed to reset memory' }, { status: 500 })
    }
}
