import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/labels/conversations
 * Returns all conversation-label mappings for the account.
 * Used by the chat page to show label badges on all conversations at once.
 * Response format: { [whatsappJid]: [{ id, name, color }] }
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const callerUser = await prisma.user.findFirst({ where: { authId: user.id } })
        if (!callerUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        // Get all conversation-label mappings for this account
        const mappings = await prisma.conversationLabel.findMany({
            where: {
                conversation: { accountId: callerUser.accountId }
            },
            include: {
                label: { select: { id: true, name: true, color: true } },
                conversation: { select: { whatsappJid: true } }
            }
        })

        // Group by whatsappJid
        const result: Record<string, { id: string; name: string; color: string }[]> = {}
        for (const m of mappings) {
            const jid = m.conversation.whatsappJid
            if (!jid) continue
            if (!result[jid]) result[jid] = []
            result[jid].push(m.label)
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('[GET /api/labels/conversations]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
