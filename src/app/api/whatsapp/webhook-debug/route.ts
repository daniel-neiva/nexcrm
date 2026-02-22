import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        console.log("---- RAW WEBHOOK DATA ----")
        console.log(JSON.stringify(body, null, 2))
        console.log("--------------------------")
        return NextResponse.json({ status: 'ok' })
    } catch (e) {
        return NextResponse.json({ status: 'ok' })
    }
}
