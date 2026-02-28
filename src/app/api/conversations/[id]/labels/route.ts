import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// GET labels for a conversation
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const labels = await prisma.conversationLabel.findMany({
            where: { conversationId: params.id },
            include: { label: true }
        })

        return NextResponse.json(labels.map(cl => cl.label))
    } catch (error) {
        console.error('[GET /api/conversations/[id]/labels]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST add a label to a conversation
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { labelId } = await req.json()
        if (!labelId) return NextResponse.json({ error: 'labelId is required' }, { status: 400 })

        await prisma.conversationLabel.create({
            data: {
                conversationId: params.id,
                labelId
            }
        })

        const label = await prisma.label.findUnique({ where: { id: labelId } })
        return NextResponse.json(label, { status: 201 })
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'Label already applied' }, { status: 409 })
        }
        console.error('[POST /api/conversations/[id]/labels]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE remove a label from a conversation
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { labelId } = await req.json()
        if (!labelId) return NextResponse.json({ error: 'labelId is required' }, { status: 400 })

        await prisma.conversationLabel.delete({
            where: {
                conversationId_labelId: {
                    conversationId: params.id,
                    labelId
                }
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[DELETE /api/conversations/[id]/labels]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
