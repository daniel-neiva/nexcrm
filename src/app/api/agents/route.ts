import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { VoiceType } from '@prisma/client'

// GET all AI Agents for the account
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

        const agents = await prisma.agent.findMany({
            where: { accountId: callerUser.accountId },
            include: {
                knowledgeData: true,
                attributes: true
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(agents)
    } catch (error) {
        console.error('[GET /api/agents]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST create a new Agent with nested relation configurations
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const callerUser = await prisma.user.findFirst({ where: { authId: user.id } })
        if (!callerUser || callerUser.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Only admins can create AI Agents' }, { status: 403 })
        }

        if (!callerUser.accountId) {
            console.error(`[POST /api/agents] User ${callerUser.id} has no accountId`)
            return NextResponse.json({ error: 'Usuário não tem uma conta vinculada.' }, { status: 400 })
        }

        const body = await req.json()
        const {
            name, roleDescription,
            voiceType, messageGrouping, groupingDelay,
            humanHandoffRules, timeBasedRouting,
            companyName, companyUrl, companyDescription,
            communicationStyle, prompt, flow, isActive,
            knowledgeData = [], attributes = []
        } = body

        if (!name || !prompt) {
            return NextResponse.json({ error: 'Name and Base Prompt are mandatory' }, { status: 400 })
        }

        const newAgent = await prisma.agent.create({
            data: {
                accountId: callerUser.accountId,
                name,
                roleDescription,
                voiceType: voiceType as VoiceType,
                messageGrouping,
                groupingDelay,
                humanHandoffRules,
                timeBasedRouting,
                companyName,
                companyUrl,
                companyDescription,
                communicationStyle,
                prompt,
                flow,
                isActive,
                knowledgeData: {
                    create: knowledgeData.map((k: any) => ({ tagName: k.tagName, content: k.content }))
                },
                attributes: {
                    create: attributes.map((a: any) => ({
                        fieldType: a.fieldType,
                        description: a.description,
                        isRequired: a.isRequired
                    }))
                }
            },
            include: {
                knowledgeData: true,
                attributes: true
            }
        })

        return NextResponse.json(newAgent, { status: 201 })
    } catch (error: any) {
        console.error('[POST /api/agents]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
