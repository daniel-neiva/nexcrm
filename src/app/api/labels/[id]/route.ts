import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// PATCH update a label
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { id: labelId } = await params
        const { name, color, description } = await req.json()

        const updated = await prisma.label.update({
            where: { id: labelId },
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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { id: labelId } = await params

        // Delete junction records first (cascade should handle this, but being explicit)
        await prisma.conversationLabel.deleteMany({ where: { labelId } })
        await prisma.contactLabel.deleteMany({ where: { labelId } })

        await prisma.label.delete({ where: { id: labelId } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[DELETE /api/labels/[id]]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
