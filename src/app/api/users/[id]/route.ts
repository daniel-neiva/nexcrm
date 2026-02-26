import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params
        const { id } = params
        if (!id) return NextResponse.json({ error: 'Missing defined user ID' }, { status: 400 })

        const body = await req.json()
        const { role } = body

        if (!role) {
            return NextResponse.json({ error: 'No properties to update provided' }, { status: 400 })
        }

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

        const updatedUser = await prisma.user.update({
            where: { id, accountId: callerUser.accountId },
            data: { role: role as Role }
        })

        return NextResponse.json(updatedUser)
    } catch (error: any) {
        console.error('[PATCH /api/users/:id]', error)
        if (error.code === 'P2025') return NextResponse.json({ error: 'User not found' }, { status: 404 })
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params
        const { id } = params
        if (!id) return NextResponse.json({ error: 'Missing defined user ID' }, { status: 400 })

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

        await prisma.user.delete({
            where: { id, accountId: callerUser.accountId }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[DELETE /api/users/:id]', error)
        if (error.code === 'P2025') return NextResponse.json({ error: 'User not found' }, { status: 404 })
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
