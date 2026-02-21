import { chatWithAgent, quickAIResponse } from '@/lib/groq'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { messages, agent } = body

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: 'Messages array is required' },
                { status: 400 }
            )
        }

        let response: string

        if (agent) {
            response = await chatWithAgent(agent, messages)
        } else {
            const lastMessage = messages[messages.length - 1]
            response = await quickAIResponse(lastMessage.content)
        }

        return NextResponse.json({ response })
    } catch (error) {
        console.error('AI Chat Error:', error)
        return NextResponse.json(
            { error: 'Erro ao processar mensagem com IA' },
            { status: 500 }
        )
    }
}
