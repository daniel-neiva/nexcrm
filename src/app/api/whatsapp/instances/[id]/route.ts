import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Find the inbox
        const inbox = await prisma.inbox.findUnique({ where: { id } })
        if (!inbox) return NextResponse.json({ error: 'Inbox not found' }, { status: 404 })

        // 1. Delete from Evolution API (ignore errors — might already be gone)
        try {
            await fetch(`${EVOLUTION_API_URL}/instance/delete/${inbox.instanceName}`, {
                method: 'DELETE',
                headers: { apikey: EVOLUTION_API_KEY },
                cache: 'no-store'
            })
            console.log(`[DELETE] Evolution instance ${inbox.instanceName} deleted`)
        } catch (e) {
            console.warn(`[DELETE] Could not delete Evolution instance ${inbox.instanceName}:`, e)
        }

        // 2. Delete from DB (cascades to conversations, messages)
        await prisma.inbox.delete({ where: { id } })
        console.log(`[DELETE] Inbox ${id} deleted from DB`)

        // 3. Notify clients
        await supabaseAdmin.channel('whatsapp_updates').send({
            type: 'broadcast',
            event: 'inbox_status_updated',
            payload: { inboxId: id, deleted: true }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[DELETE /api/whatsapp/instances/[id]]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
