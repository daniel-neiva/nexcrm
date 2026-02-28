import { sendTextMessage } from '@/lib/evolution'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { number, text, inboxId } = body

        if (!number || !text) {
            return NextResponse.json(
                { error: 'number and text are required' },
                { status: 400 }
            )
        }

        // Find the instance name
        let instanceName: string | undefined
        if (inboxId) {
            const inbox = await prisma.inbox.findUnique({ where: { id: inboxId } })
            instanceName = inbox?.instanceName
        }

        const result = await sendTextMessage(number, text, instanceName)
        return NextResponse.json(result)
    } catch (error) {
        console.error('WhatsApp Send Error:', error)
        return NextResponse.json(
            { error: 'Erro ao enviar mensagem' },
            { status: 500 }
        )
    }
}

