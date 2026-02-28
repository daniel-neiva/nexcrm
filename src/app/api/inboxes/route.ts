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

        const inboxes = await prisma.inbox.findMany({
            where: { accountId: callerUser.accountId },
            orderBy: { createdAt: 'asc' }
        })

        return NextResponse.json(inboxes)
    } catch (error) {
        console.error('[GET /api/inboxes]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
