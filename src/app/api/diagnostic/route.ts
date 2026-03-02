import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

export async function GET(req) {
    const url = new URL(req.url)
    const instanceName = url.searchParams.get('instance') || 'daniel-pessoal'

    try {
        const start = Date.now()
        const res = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
            headers: { apikey: EVOLUTION_API_KEY },
            cache: 'no-store'
        })
        const duration = Date.now() - start

        const text = await res.text()
        return NextResponse.json({
            success: res.ok,
            status: res.status,
            durationMs: duration,
            rawText: text.substring(0, 500) // cap size
        })
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 })
    }
}
