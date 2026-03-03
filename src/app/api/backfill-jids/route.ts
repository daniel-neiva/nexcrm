import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { normalizeJid, extractPhoneFromJid } from '@/lib/evolution'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/backfill-jids
 * Normalizes existing data:
 * 1. Conversation.whatsappJid → normalized format
 * 2. Contact.phone → normalized format  
 * 3. Message.whatsappJid → normalized format
 * Idempotent — safe to run multiple times.
 */
export async function POST() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const results = {
        conversations: { total: 0, updated: 0, skipped: 0, errors: 0 },
        contacts: { total: 0, updated: 0, skipped: 0, errors: 0 },
        messages: { total: 0, updated: 0, skipped: 0, errors: 0 },
    }

    // 1. Normalize Conversation.whatsappJid
    const conversations = await prisma.conversation.findMany({
        select: { id: true, whatsappJid: true }
    })
    results.conversations.total = conversations.length

    for (const conv of conversations) {
        if (!conv.whatsappJid) { results.conversations.skipped++; continue }
        const normalized = normalizeJid(conv.whatsappJid, `backfill/conversation/${conv.id}`)
        if (!normalized) { results.conversations.skipped++; continue }
        if (normalized === conv.whatsappJid) { results.conversations.skipped++; continue }

        try {
            await prisma.conversation.update({
                where: { id: conv.id },
                data: { whatsappJid: normalized }
            })
            results.conversations.updated++
        } catch (e: any) {
            // Unique constraint conflict — another conversation already has this normalized JID
            results.conversations.errors++
            console.warn(`[Backfill] Conversation ${conv.id}: ${e.message}`)
        }
    }

    // 2. Normalize Contact.phone
    const contacts = await prisma.contact.findMany({
        select: { id: true, phone: true }
    })
    results.contacts.total = contacts.length

    for (const contact of contacts) {
        if (!contact.phone) { results.contacts.skipped++; continue }
        const normalized = normalizeJid(contact.phone, `backfill/contact/${contact.id}`)
        if (!normalized) { results.contacts.skipped++; continue }
        if (normalized === contact.phone) { results.contacts.skipped++; continue }

        try {
            await prisma.contact.update({
                where: { id: contact.id },
                data: { phone: normalized }
            })
            results.contacts.updated++
        } catch (e: any) {
            results.contacts.errors++
            console.warn(`[Backfill] Contact ${contact.id}: ${e.message}`)
        }
    }

    // 3. Normalize Message.whatsappJid (recent messages only — last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const messages = await prisma.message.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { id: true, whatsappJid: true }
    })
    results.messages.total = messages.length

    for (const msg of messages) {
        if (!msg.whatsappJid) { results.messages.skipped++; continue }
        const normalized = normalizeJid(msg.whatsappJid, `backfill/message/${msg.id}`)
        if (!normalized) { results.messages.skipped++; continue }
        if (normalized === msg.whatsappJid) { results.messages.skipped++; continue }

        try {
            await prisma.message.update({
                where: { id: msg.id },
                data: { whatsappJid: normalized }
            })
            results.messages.updated++
        } catch (e: any) {
            results.messages.errors++
        }
    }

    return NextResponse.json({ success: true, results })
}
