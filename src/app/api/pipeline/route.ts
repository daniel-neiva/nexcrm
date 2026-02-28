import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/pipeline
 * Returns labels with their associated conversations for the Kanban board.
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const callerUser = await prisma.user.findFirst({ where: { authId: user.id } })
        if (!callerUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        // Get all labels with their conversation data
        const labels = await prisma.label.findMany({
            where: { accountId: callerUser.accountId },
            orderBy: { createdAt: 'asc' },
            include: {
                conversations: {
                    include: {
                        conversation: {
                            include: {
                                contact: { select: { id: true, name: true, phone: true, avatarUrl: true } },
                                agent: { select: { id: true, name: true } },
                                messages: {
                                    orderBy: { createdAt: 'desc' },
                                    take: 1,
                                    select: { content: true, createdAt: true, fromMe: true }
                                }
                            }
                        }
                    }
                }
            }
        })

        // Also get conversations with NO labels (the "untagged" column)
        const untaggedConversations = await prisma.conversation.findMany({
            where: {
                accountId: callerUser.accountId,
                labels: { none: {} },
                channel: 'WHATSAPP'
            },
            include: {
                contact: { select: { id: true, name: true, phone: true, avatarUrl: true } },
                agent: { select: { id: true, name: true } },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { content: true, createdAt: true, fromMe: true }
                }
            },
            orderBy: { updatedAt: 'desc' },
            take: 50
        })

        // Format the response
        const columns = labels.map(label => ({
            id: label.id,
            name: label.name,
            color: label.color,
            cards: label.conversations.map(cl => {
                const conv = cl.conversation
                const lastMsg = conv.messages[0]
                return {
                    id: conv.id,
                    contactName: conv.contact?.name || conv.whatsappJid || 'Desconhecido',
                    contactPhone: conv.contact?.phone || '',
                    contactAvatar: conv.contact?.avatarUrl || null,
                    agentName: conv.agent?.name || null,
                    lastMessage: lastMsg?.content || '',
                    lastMessageAt: lastMsg?.createdAt || conv.updatedAt,
                    status: conv.status,
                    whatsappJid: conv.whatsappJid
                }
            })
        }))

        // Add untagged column
        const untaggedCards = untaggedConversations.map(conv => {
            const lastMsg = conv.messages[0]
            return {
                id: conv.id,
                contactName: conv.contact?.name || conv.whatsappJid || 'Desconhecido',
                contactPhone: conv.contact?.phone || '',
                contactAvatar: conv.contact?.avatarUrl || null,
                agentName: conv.agent?.name || null,
                lastMessage: lastMsg?.content || '',
                lastMessageAt: lastMsg?.createdAt || conv.updatedAt,
                status: conv.status,
                whatsappJid: conv.whatsappJid
            }
        })

        return NextResponse.json({
            columns,
            untagged: { id: '__untagged', name: 'Sem Etiqueta', color: '#64748B', cards: untaggedCards }
        })
    } catch (error) {
        console.error('[GET /api/pipeline]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
