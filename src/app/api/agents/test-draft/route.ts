import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
    try {
        const { message, agentData, history } = await req.json()

        // Build System Prompt from DRAFT data (not from DB)
        let systemPrompt = `Você é ${agentData.name || "um assistente"}, um assistente inteligente da empresa ${agentData.companyName || "nossa empresa"}.
        
        Sua Função: ${agentData.roleDescription || "Assistente de atendimento."}
        Sua Personalidade: ${agentData.communicationStyle || "PROFESSIONAL"}
        Sobre a Empresa: ${agentData.companyDescription || "Não especificado."}
        URL da Empresa: ${agentData.companyUrl || "Não especificado."}
        
        INSTRUÇÕES MESTRAS:
        ${agentData.prompt || "Aja de forma prestativa."}
        
        REGRAS DE TRANSBORDO HUMANO:
        ${agentData.humanHandoffRules || "Nenhuma regra específica."}
        
        CONHECIMENTO COMPLEMENTAR:`

        agentData.knowledgeData?.forEach((k: any) => {
            systemPrompt += `\n- ${k.tagName}: ${k.content}`
        })

        if (agentData.attributes?.length > 0) {
            systemPrompt += `\n\nATRIBUTOS QUE VOCÊ DEVE COLETAR:`
            agentData.attributes.forEach((attr: any) => {
                systemPrompt += `\n- ${attr.fieldType}: ${attr.description} (${attr.isRequired ? "OBRIGATÓRIO" : "OPCIONAL"})`
            })
        }

        systemPrompt += `\n\nREGRAS GERAIS:
        - Responda em Português do Brasil.
        - Seja conciso e direto ao ponto.
        - Você está em modo de TESTE/DRAFT. Ajude o usuário a validar sua configuração.`

        // Call OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                ...history.slice(-5), // Only last 5 for test speed/usage
                { role: "user", content: message },
            ],
            temperature: 0.7,
            max_tokens: 500,
        })

        const aiResponse = completion.choices[0]?.message?.content || "Sem resposta."

        return NextResponse.json({
            success: true,
            response: aiResponse
        })

    } catch (error: any) {
        console.error("Test Draft API Error:", error)
        return NextResponse.json({ error: error.message || "Erro no teste da IA" }, { status: 500 })
    }
}
