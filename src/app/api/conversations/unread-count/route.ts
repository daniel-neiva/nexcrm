import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const callerUser = await prisma.user.findFirst({ where: { authId: user.id } })
        if (!callerUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const result = await prisma.conversation.aggregate({
            where: { accountId: callerUser.accountId },
            _sum: {
                unreadCount: true
            }
        })

        return NextResponse.json({
            totalUnreadCount: result._sum.unreadCount || 0
        })
    } catch (error) {
        console.error('[GET /api/conversations/unread-count]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
