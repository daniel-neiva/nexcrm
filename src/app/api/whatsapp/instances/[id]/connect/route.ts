import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const inbox = await prisma.inbox.findUnique({
            where: { id },
        })

        if (!inbox) return NextResponse.json({ error: 'Inbox not found' }, { status: 404 })

        // 1. Check connection status in Evolution
        const statusRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${inbox.instanceName}`, {
            headers: { apikey: EVOLUTION_API_KEY }
        })
        const statusData = await statusRes.json()
        const isConnected = statusData.instance?.state === 'open'

        // Update database status if changed
        if (isConnected && inbox.status !== 'CONNECTED') {
            await prisma.inbox.update({
                where: { id: inbox.id },
                data: { status: 'CONNECTED' }
            })
        } else if (!isConnected && inbox.status === 'CONNECTED') {
            await prisma.inbox.update({
                where: { id: inbox.id },
                data: { status: 'DISCONNECTED' }
            })
        }

        if (isConnected) {
            // Ensure DB is in sync
            if (inbox.status !== 'CONNECTED') {
                await prisma.inbox.update({
                    where: { id: inbox.id },
                    data: { status: 'CONNECTED' }
                })

                // Broadcast status update to clients
                await supabaseAdmin.channel('sidebar_updates').send({
                    type: 'broadcast',
                    event: 'inbox_status_updated',
                    payload: {
                        inboxId: inbox.id,
                        status: 'CONNECTED'
                    }
                })
            }
            return NextResponse.json({ status: 'CONNECTED' })
        }

        // 2. If disconnected, get QR Code
        const qrRes = await fetch(`${EVOLUTION_API_URL}/instance/connect/${inbox.instanceName}`, {
            headers: { apikey: EVOLUTION_API_KEY }
        })
        const qrData = await qrRes.json()

        return NextResponse.json({
            status: 'DISCONNECTED',
            qrcode: qrData.base64 || qrData.qrcode?.base64 // Handle both direct and nested base64
        })
    } catch (error) {
        console.error('[GET /api/whatsapp/instances/[id]/connect]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
