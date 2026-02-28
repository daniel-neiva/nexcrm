import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000'

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const dbUser = await prisma.user.findFirst({ where: { authId: user.id } })
        if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const { name, instanceName } = await req.json()
        if (!name || !instanceName) {
            return NextResponse.json({ error: 'Name and Instance Name are required' }, { status: 400 })
        }

        // 1. Create instance in Evolution API
        let createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: EVOLUTION_API_KEY
            },
            body: JSON.stringify({
                instanceName,
                token: `token-${instanceName}`,
                number: '',
                qrcode: true,
                webhook_events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE', 'CONNECTION_UPDATE', 'CHATS_UPDATE', 'CHATS_UPSERT']
            })
        })

        let evoData;
        if (!createRes.ok) {
            const errText = await createRes.text()
            try {
                const errJson = JSON.parse(errText)
                const errorMessage = errJson.message ||
                    errJson.errors?.[0] ||
                    errJson.response?.message?.[0] ||
                    errText;

                const isAlreadyExists = /already exists|already in use/i.test(errorMessage);

                if (isAlreadyExists) {
                    console.log(`[API] Instance ${instanceName} already exists/in use. Linking...`)
                } else {
                    console.error('Evolution API error:', errText)
                    return NextResponse.json({ error: 'Failed to create instance in Evolution API: ' + errorMessage }, { status: 500 })
                }
            } catch (e) {
                console.error('Evolution API error (non-json):', errText)
                return NextResponse.json({ error: 'Failed to create instance in Evolution API' }, { status: 500 })
            }
        } else {
            evoData = await createRes.json()
        }

        // 2. Set Webhook for this instance
        const webhookUrl = `${APP_URL}/api/whatsapp/webhook`
        await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: EVOLUTION_API_KEY
            },
            body: JSON.stringify({
                webhook: {
                    enabled: true,
                    url: webhookUrl,
                    webhookByEvents: false,
                    webhookBase64: false,
                    events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE', 'CONNECTION_UPDATE', 'CHATS_UPDATE', 'CHATS_UPSERT'],
                    headers: {
                        "x-evo-token": "nexcrm-secure-1234"
                    }
                }
            })
        })

        // 3. Check current connection status if it's an existing instance
        let currentStatus = 'DISCONNECTED'
        try {
            const statusRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
                headers: { apikey: EVOLUTION_API_KEY }
            })
            if (statusRes.ok) {
                const statusData = await statusRes.json()
                if (statusData.instance?.state === 'open') {
                    currentStatus = 'CONNECTED'
                }
            }
        } catch (e) {
            console.warn(`[API] Could not fetch initial status for ${instanceName}:`, e)
        }

        // 4. Save Inbox in Database
        const inbox = await prisma.inbox.create({
            data: {
                name,
                instanceName,
                accountId: dbUser.accountId,
                status: currentStatus
            }
        })

        return NextResponse.json(inbox)
    } catch (error) {
        console.error('[POST /api/whatsapp/instances]', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
