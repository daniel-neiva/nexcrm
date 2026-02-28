import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/contacts — list/search contacts for the account
 * Query params: ?search=term&label=labelId&page=1&limit=50
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const callerUser = await prisma.user.findFirst({ where: { authId: user.id } })
        if (!callerUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const searchParams = req.nextUrl.searchParams
        const search = searchParams.get('search') || ''
        const labelId = searchParams.get('label') || ''
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const skip = (page - 1) * limit

        const where: any = { accountId: callerUser.accountId }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ]
        }

        if (labelId) {
            where.labels = { some: { labelId } }
        }

        const [contacts, total] = await Promise.all([
            prisma.contact.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit,
                include: {
                    labels: { include: { label: { select: { id: true, name: true, color: true } } } },
                    conversations: {
                        take: 1,
                        orderBy: { updatedAt: 'desc' },
                        select: {
                            id: true,
                            whatsappJid: true,
                            status: true,
                            updatedAt: true,
                            messages: {
                                take: 1,
                                orderBy: { createdAt: 'desc' },
                                select: { content: true, createdAt: true }
                            }
                        }
                    }
                }
            }),
            prisma.contact.count({ where })
        ])

        const result = contacts.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            avatarUrl: c.avatarUrl,
            createdAt: c.createdAt,
            labels: c.labels.map(cl => cl.label),
            lastConversation: c.conversations[0] ? {
                id: c.conversations[0].id,
                status: c.conversations[0].status,
                updatedAt: c.conversations[0].updatedAt,
                lastMessage: c.conversations[0].messages[0]?.content || null,
                lastMessageAt: c.conversations[0].messages[0]?.createdAt || null
            } : null
        }))

        return NextResponse.json({ contacts: result, total, page, pages: Math.ceil(total / limit) })
    } catch (error) {
        console.error('[GET /api/contacts]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

/**
 * PATCH /api/contacts — update a contact
 * Body: { id, name?, email?, phone? }
 */
export async function PATCH(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { id, name, email, phone } = await req.json()
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

        const updated = await prisma.contact.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(email !== undefined && { email }),
                ...(phone !== undefined && { phone }),
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('[PATCH /api/contacts]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
