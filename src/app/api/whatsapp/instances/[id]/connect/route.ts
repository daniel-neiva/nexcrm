import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
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
            headers: { apikey: EVOLUTION_API_KEY },
            cache: 'no-store'
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
            headers: { apikey: EVOLUTION_API_KEY },
            cache: 'no-store'
        })

        if (!qrRes.ok) {
            const errText = await qrRes.text()
            console.error(`[GET /connect] Evolution API rejected QR request for ${inbox.instanceName}:`, errText)
            return NextResponse.json({ error: 'Failed to fetch QR Code from Evolution.' }, { status: 500 })
        }

        const qrData = await qrRes.json()

        let base64Image = qrData.base64 || qrData.qrcode?.base64 || qrData.code || '';

        // Evolution sometimes returns raw base64 without the data:image prefix
        if (base64Image && !base64Image.startsWith('data:image')) {
            base64Image = `data:image/png;base64,${base64Image}`;
        }

        return NextResponse.json({
            status: 'DISCONNECTED',
            qrcode: base64Image
        })
    } catch (error) {
        console.error('[GET /api/whatsapp/instances/[id]/connect]', error)
        try {
            require('fs').appendFileSync('api-crash.log', new Date().toISOString() + ' ERROR in connect/route.ts: ' + (error instanceof Error ? error.stack : String(error)) + '\n');
        } catch (e) { }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
