import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/dashboard
 * Returns real-time metrics for the dashboard.
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const callerUser = await prisma.user.findFirst({ where: { authId: user.id } })
        if (!callerUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const accountId = callerUser.accountId
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

        // Run all queries in parallel
        const [
            totalConversations,
            openConversations,
            totalContacts,
            activeAgents,
            totalAgents,
            todayMessages,
            last7DaysMessages,
            pipelineData,
            recentConversations,
            todayNewContacts
        ] = await Promise.all([
            // Total conversations
            prisma.conversation.count({ where: { accountId } }),
            // Open conversations
            prisma.conversation.count({ where: { accountId, status: 'OPEN' } }),
            // Total contacts
            prisma.contact.count({ where: { accountId } }),
            // Active AI agents
            prisma.agent.count({ where: { accountId, isActive: true } }),
            // Total agents
            prisma.agent.count({ where: { accountId } }),
            // Messages today
            prisma.message.count({ where: { conversation: { accountId }, createdAt: { gte: today } } }),
            // Messages last 7 days
            prisma.message.count({ where: { conversation: { accountId }, createdAt: { gte: last7Days } } }),
            // Pipeline: labels with count of conversations
            prisma.label.findMany({
                where: { accountId },
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    name: true,
                    color: true,
                    _count: { select: { conversations: true } }
                }
            }),
            // Recent conversations with activity
            prisma.conversation.findMany({
                where: { accountId, channel: 'WHATSAPP' },
                orderBy: { updatedAt: 'desc' },
                take: 8,
                select: {
                    id: true,
                    whatsappJid: true,
                    status: true,
                    updatedAt: true,
                    aiEnabled: true,
                    contact: { select: { name: true, phone: true, avatarUrl: true } },
                    agent: { select: { name: true } },
                    labels: { include: { label: { select: { name: true, color: true } } } },
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: { content: true, fromMe: true, createdAt: true }
                    }
                }
            }),
            // New contacts today
            prisma.contact.count({ where: { accountId, createdAt: { gte: today } } }),
        ])

        // AI response rate: messages from bot / total incoming (last 7 days)
        const aiMessages = await prisma.message.count({
            where: {
                conversation: { accountId, aiEnabled: true },
                fromMe: true,
                createdAt: { gte: last7Days }
            }
        })
        const incomingMessages = await prisma.message.count({
            where: {
                conversation: { accountId },
                fromMe: false,
                createdAt: { gte: last7Days }
            }
        })
        const aiResponseRate = incomingMessages > 0
            ? Math.round((aiMessages / incomingMessages) * 100)
            : 0

        return NextResponse.json({
            stats: {
                totalConversations,
                openConversations,
                totalContacts,
                activeAgents,
                totalAgents,
                todayMessages,
                last7DaysMessages,
                aiResponseRate,
                todayNewContacts
            },
            pipeline: pipelineData.map(l => ({
                id: l.id,
                name: l.name,
                color: l.color,
                count: l._count.conversations
            })),
            recentActivity: recentConversations.map(conv => ({
                id: conv.id,
                contactName: conv.contact?.name || conv.whatsappJid || 'Desconhecido',
                contactPhone: conv.contact?.phone || '',
                contactAvatar: conv.contact?.avatarUrl || null,
                agentName: conv.agent?.name || null,
                status: conv.status,
                aiEnabled: conv.aiEnabled,
                lastMessage: conv.messages[0]?.content || '',
                lastMessageFromMe: conv.messages[0]?.fromMe || false,
                lastMessageAt: conv.messages[0]?.createdAt || conv.updatedAt,
                labels: conv.labels.map(cl => ({ name: cl.label.name, color: cl.label.color }))
            }))
        })
    } catch (error) {
        console.error('[GET /api/dashboard]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
