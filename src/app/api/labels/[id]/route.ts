import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// PATCH update a label
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { name, color, description } = await req.json()

        const updated = await prisma.label.update({
            where: { id: params.id },
            data: { name, color, description }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('[PATCH /api/labels/[id]]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE a label
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Delete junction records first
        await prisma.conversationLabel.deleteMany({ where: { labelId: params.id } })
        await prisma.contactLabel.deleteMany({ where: { labelId: params.id } })

        await prisma.label.delete({ where: { id: params.id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[DELETE /api/labels/[id]]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
