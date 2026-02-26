import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const callerUser = await prisma.user.findFirst({
            where: { authId: user.id }
        })

        if (!callerUser) {
            return NextResponse.json({ error: 'User profile not found in CRM' }, { status: 404 })
        }

        const users = await prisma.user.findMany({
            where: { accountId: callerUser.accountId },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(users)
    } catch (error) {
        console.error('[GET /api/users]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { email, name, role } = body

        if (!email || !name) {
            return NextResponse.json({ error: 'Missing defined fields' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const callerUser = await prisma.user.findFirst({
            where: { authId: user.id }
        })

        if (!callerUser || callerUser.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Only admins can invite new team members' }, { status: 403 })
        }

        const { supabaseAdmin } = await import('@/lib/supabase/admin')

        // Send an invite email that triggers our Postgres function on creation
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                name,
                role: (role as Role) || 'AGENT',
                accountId: callerUser.accountId
            }
        })

        if (inviteError) {
            console.error('[Supabase Admin Invite Auth Error]', inviteError)
            return NextResponse.json({ error: inviteError.message }, { status: 400 })
        }

        return NextResponse.json({ success: true, message: 'Invite sent', userId: inviteData.user.id }, { status: 201 })
    } catch (error: any) {
        console.error('[POST /api/users]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
