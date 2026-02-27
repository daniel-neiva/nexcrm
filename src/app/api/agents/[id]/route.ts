import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// GET a single agent
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const agent = await prisma.agent.findUnique({
            where: { id: params.id },
            include: {
                knowledgeData: true,
                attributes: true
            }
        })

        if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

        return NextResponse.json(agent)
    } catch (error) {
        console.error('[GET /api/agents/[id]]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// PATCH update an agent (e.g., isActive)
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { isActive, name, roleDescription, prompt, flow } = body

        const updated = await prisma.agent.update({
            where: { id: params.id },
            data: {
                isActive,
                name,
                roleDescription,
                prompt,
                flow
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('[PATCH /api/agents/[id]]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// DELETE an agent
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Delete relations first if not cascading
        await prisma.agentKnowledge.deleteMany({ where: { agentId: params.id } })
        await prisma.agentAttribute.deleteMany({ where: { agentId: params.id } })

        await prisma.agent.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[DELETE /api/agents/[id]]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
