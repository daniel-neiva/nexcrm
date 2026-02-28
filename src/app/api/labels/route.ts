import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// GET all labels for the account
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const callerUser = await prisma.user.findFirst({ where: { authId: user.id } })
        if (!callerUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const labels = await prisma.label.findMany({
            where: { accountId: callerUser.accountId },
            orderBy: { createdAt: 'asc' }
        })

        return NextResponse.json(labels)
    } catch (error) {
        console.error('[GET /api/labels]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST create a new label
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const callerUser = await prisma.user.findFirst({ where: { authId: user.id } })
        if (!callerUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const { name, color, description } = await req.json()
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

        const label = await prisma.label.create({
            data: {
                name,
                color: color || '#3B82F6',
                description: description || null,
                accountId: callerUser.accountId
            }
        })

        return NextResponse.json(label, { status: 201 })
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Label with this name already exists' }, { status: 409 })
        }
        console.error('[POST /api/labels]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
