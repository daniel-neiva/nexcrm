import { NextRequest, NextResponse } from 'next/server'
import { setLidPhone } from '@/lib/lid-map'

/**
 * Webhook receiver for Evolution API events.
 * Captures senderPn from messages to resolve LID → phone mappings.
 * 
 * Evolution API sends POST with body like:
 * {
 *   event: "messages.upsert",
 *   data: {
 *     key: { remoteJid: "123456@lid", fromMe: false },
 *     senderPn: "5561999887766@s.whatsapp.net",
 *     pushName: "Contact Name",
 *     message: { ... }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        const event = body.event || ''
        const data = body.data || body

        // Handle both single and array payloads
        const messages = Array.isArray(data) ? data : [data]

        for (const msg of messages) {
            const key = msg.key || {}
            const remoteJid: string = key.remoteJid || msg.remoteJid || ''
            const senderPn: string = msg.senderPn || ''

            // If message is from a LID and has senderPn, store the mapping
            if (remoteJid.endsWith('@lid') && senderPn) {
                const phone = senderPn.replace('@s.whatsapp.net', '').replace('@lid', '')
                console.log(`[Webhook] LID mapping: ${remoteJid} → ${phone}`)
                setLidPhone(remoteJid, phone)
            }

            // Also check participant field (for group messages)  
            const participant: string = key.participant || msg.participant || ''
            if (participant.endsWith('@lid') && senderPn) {
                const phone = senderPn.replace('@s.whatsapp.net', '').replace('@lid', '')
                setLidPhone(participant, phone)
            }
        }

        // Log event type for debugging
        if (event) {
            console.log(`[Webhook] Event: ${event}, messages: ${messages.length}`)
        }

        return NextResponse.json({ status: 'ok' })
    } catch (error) {
        console.error('[Webhook] Error:', error)
        return NextResponse.json({ status: 'ok' }) // Always 200 to prevent retries
    }
}

// Evolution API may also send GET for webhook verification
export async function GET() {
    return NextResponse.json({ status: 'active', service: 'nexcrm-webhook' })
}
