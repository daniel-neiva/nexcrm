import Groq from 'groq-sdk'

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
})

export interface AgentConfig {
    name: string
    prompt: string
    personality: string
    voiceType: string
}

export async function chatWithAgent(
    agent: AgentConfig,
    messages: { role: 'user' | 'assistant'; content: string }[]
) {
    const systemPrompt = `Você é ${agent.name}, um agente de IA do NexCRM.

Personalidade: ${agent.personality}
Tom de voz: ${agent.voiceType}

Instruções:
${agent.prompt}

Regras:
- Responda em Português do Brasil
- Seja conciso e útil
- Mantenha a personalidade definida acima
- Quando não souber algo, diga honestamente`

    const completion = await groq.chat.completions.create({
        messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 1,
    })

    return completion.choices[0]?.message?.content || 'Sem resposta.'
}

export async function quickAIResponse(userMessage: string) {
    const completion = await groq.chat.completions.create({
        messages: [
            {
                role: 'system',
                content: 'Você é um assistente de CRM inteligente. Responda de forma concisa e útil em Português do Brasil.',
            },
            { role: 'user', content: userMessage },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
        max_tokens: 512,
    })

    return completion.choices[0]?.message?.content || 'Sem resposta.'
}
