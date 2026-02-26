import { NextRequest, NextResponse } from 'next/server'
import { setWebhook } from '@/lib/evolution'

/**
 * POST /api/whatsapp/webhook/register
 * 
 * Registers the webhook URL with the Evolution API.
 * Call this once when deploying, passing the public URL of your app.
 * 
 * Body: { "baseUrl": "https://your-deployed-app.com" }
 */
export async function POST(request: NextRequest) {
    try {
        const { baseUrl } = await request.json()

        if (!baseUrl) {
            return NextResponse.json(
                { error: 'baseUrl is required (e.g. https://nexcrm.vercel.app)' },
                { status: 400 }
            )
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://doietkbuscrcpyujmmdp.supabase.co'
        const webhookUrl = `${supabaseUrl}/functions/v1/evo-webhook`

        const result = await setWebhook(webhookUrl)

        console.log(`[Webhook] Registered: ${webhookUrl}`)

        return NextResponse.json({
            status: 'registered',
            webhookUrl,
            result,
        })
    } catch (error) {
        console.error('[Webhook] Registration error:', error)
        return NextResponse.json(
            { error: 'Failed to register webhook' },
            { status: 500 }
        )
    }
}
