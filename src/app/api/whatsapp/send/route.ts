import { sendTextMessage } from '@/lib/evolution'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { number, text } = body

        if (!number || !text) {
            return NextResponse.json(
                { error: 'number and text are required' },
                { status: 400 }
            )
        }

        const result = await sendTextMessage(number, text)
        return NextResponse.json(result)
    } catch (error) {
        console.error('WhatsApp Send Error:', error)
        return NextResponse.json(
            { error: 'Erro ao enviar mensagem' },
            { status: 500 }
        )
    }
}
