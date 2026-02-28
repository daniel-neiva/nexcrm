import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

async function sha256(text: string) {
    const hash = crypto.createHash('sha256')
    hash.update(text)
    return hash.digest('hex')
}

/**
 * Webhook receiver for Evolution API events.
 * Standardized to INGESTION-ONLY. Processing happens asynchronously in /api/whatsapp/processor.
 */
export async function POST(request: NextRequest) {
    try {
        const payload = await request.json()
        const instance = payload?.instance || payload?.data?.instance || payload?.session || "unknown"
        const eventType = payload?.event || payload?.type || payload?.data?.event || "unknown"

        // 1) Idempotency Key - Prevent duplicate webhook processing
        const data = payload?.data || payload
        const candidateId = data?.key?.id || data?.message?.key?.id || data?.id || payload?.id
        const rawString = JSON.stringify(payload)
        const eventKey = candidateId
            ? `${instance}:${eventType}:${candidateId}`
            : `${instance}:${eventType}:hash:${await sha256(rawString)}`

        // 2) Fast Ingestion into raw event log
        // This triggers the Supabase Database Webhook -> /api/whatsapp/processor
        await prisma.whatsappEventRaw.upsert({
            where: { eventKey },
            create: {
                instance,
                eventType,
                eventKey,
                payload
            },
            update: {} // Use upsert to handle retries from Evolution API gracefully
        })

        console.log(`[Webhook] Ingested event: ${eventType} | Instance: ${instance}`)

        return NextResponse.json({ status: 'ok', ingested: true })
    } catch (error) {
        console.error('[Webhook] Ingestion Error:', error)
        // We still return 200 OK so Evolution stops retrying if it's a non-recoverable error
        return NextResponse.json({ status: 'ok', error: 'logged' })
    }
}

export async function GET() {
    return NextResponse.json({ status: 'active', service: 'nexcrm-ingestor' })
}
