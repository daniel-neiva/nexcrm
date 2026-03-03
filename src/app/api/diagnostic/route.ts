import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/diagnostic
 * Returns a detailed view of the data state for debugging.
 */
export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get all inboxes
    const inboxes = await prisma.inbox.findMany({
        select: { id: true, name: true, instanceName: true, status: true }
    })

    const result: any = { inboxes: [] }

    for (const inbox of inboxes) {
        const convCount = await prisma.conversation.count({ where: { inboxId: inbox.id } })
        const msgCount = await prisma.message.count({ where: { inboxId: inbox.id } })
        const mediaCount = await prisma.message.count({
            where: { inboxId: inbox.id, type: { in: ['image', 'video', 'audio', 'document', 'sticker'] } }
        })
        const mediaWithUrl = await prisma.message.count({
            where: { inboxId: inbox.id, type: { in: ['image', 'video', 'audio', 'document', 'sticker'] }, fileUrl: { not: null } }
        })
        const emptyConversations = await prisma.conversation.findMany({
            where: { inboxId: inbox.id },
            select: {
                id: true,
                whatsappJid: true,
                _count: { select: { messages: true } }
            }
        })
        const emptyCounts = emptyConversations.filter(c => c._count.messages === 0).length
        const sampleEmpty = emptyConversations
            .filter(c => c._count.messages === 0)
            .slice(0, 5)
            .map(c => ({ id: c.id, jid: c.whatsappJid }))

        // Sample JID formats
        const sampleJids = emptyConversations
            .slice(0, 10)
            .map(c => ({ jid: c.whatsappJid, msgs: c._count.messages }))

        result.inboxes.push({
            name: inbox.name,
            instance: inbox.instanceName,
            status: inbox.status,
            conversations: convCount,
            messages: msgCount,
            mediaMessages: mediaCount,
            mediaWithFileUrl: mediaWithUrl,
            emptyConversations: emptyCounts,
            sampleEmptyConversations: sampleEmpty,
            sampleJidFormats: sampleJids,
        })
    }

    // Contact stats
    const contactCount = await prisma.contact.count()
    const contactsWithPhone = await prisma.contact.count({ where: { phone: { not: '' } } })
    result.contacts = { total: contactCount, withPhone: contactsWithPhone }

    return NextResponse.json(result)
}
