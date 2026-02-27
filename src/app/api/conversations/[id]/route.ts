import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { id: conversationId } = await params
        const body = await req.json()
        const { agentId, aiEnabled, assigneeId } = body

        const updated = await prisma.conversation.update({
            where: { id: conversationId },
            data: {
                ...(agentId !== undefined && { agentId: agentId || null }),
                ...(aiEnabled !== undefined && { aiEnabled }),
                ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
            },
            select: {
                id: true,
                agentId: true,
                aiEnabled: true,
                assigneeId: true,
                agent: { select: { id: true, name: true } }
            }
        })

        return NextResponse.json(updated)
    } catch (error: any) {
        console.error('[PATCH /api/conversations/[id]]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { id: conversationId } = await params

        const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
            select: {
                id: true,
                agentId: true,
                aiEnabled: true,
                assigneeId: true,
                whatsappJid: true,
                agent: { select: { id: true, name: true } }
            }
        })

        if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        return NextResponse.json(conversation)
    } catch (error: any) {
        console.error('[GET /api/conversations/[id]]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
