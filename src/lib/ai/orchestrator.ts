import { prisma } from "@/lib/prisma"
import OpenAI from "openai"

function getOpenAI() {
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function processAgentMessage(agentId: string, conversationId: string, userMessage: string) {
    try {
        // 1. Fetch Agent with all its knowledge and attributes
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            include: {
                knowledgeData: true,
                attributes: true,
            },
        })

        if (!agent || !agent.isActive) {
            throw new Error("Agente não encontrado ou inativo.")
        }

        // 2. Fetch Conversation History (last 10 messages)
        const history = await prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: "desc" },
            take: 10,
        })

        const formattedHistory = history.reverse().map((msg) => ({
            role: msg.sender === "AI_AGENT" ? "assistant" : "user" as "assistant" | "user",
            content: msg.content,
        }))

        // 3. Fetch all available labels for the account to use as classification context
        const labels = await prisma.label.findMany({
            where: { accountId: agent.accountId },
            select: { id: true, name: true, description: true }
        })

        // 4. Build System Prompt
        let systemPrompt = `Você é ${agent.name}, um assistente inteligente da empresa ${agent.companyName}.
        
        Sua Função: ${agent.roleDescription}
        Sua Personalidade: ${agent.communicationStyle}
        Sobre a Empresa: ${agent.companyDescription || "Não especificado."}
        URL da Empresa: ${agent.companyUrl || "Não especificado."}
        
        INSTRUÇÕES MESTRAS:
        ${agent.prompt}
        
        REGRAS DE TRANSBORDO HUMANO:
        ${agent.humanHandoffRules}
        
        ETIQUETAS DE CRM (ESTÁGIOS DO LEAD):
        Você deve analisar o estágio do lead e sugerir a etiqueta MAIS ADEQUADA se houver uma mudança de status.
        Etiquetas disponíveis:
        ${labels.map(l => `- "${l.name}": ${l.description || "Sem descrição"}`).join('\n')}

        REGRA DE ETIQUETAGEM:
        Se você identificar que o lead mudou de estágio, adicione EXATAMENTE este formato ao FINAL da sua resposta: <suggested_label>NOME_DA_ETIQUETA</suggested_label>
        Substitua NOME_DA_ETIQUETA pelo nome exato de uma das etiquetas acima. Se não houver mudança clara, não adicione nada.

        CONHECIMENTO COMPLEMENTAR:`

        agent.knowledgeData.forEach((k) => {
            systemPrompt += `\n- ${k.tagName}: ${k.content}`
        })

        if (agent.attributes.length > 0) {
            systemPrompt += `\n\nATRIBUTOS QUE VOCÊ DEVE COLETAR (Se ainda não tiver os dados):`
            agent.attributes.forEach((attr) => {
                systemPrompt += `\n- ${attr.fieldType}: ${attr.description} (${attr.isRequired ? "OBRIGATÓRIO" : "OPCIONAL"})`
            })
        }

        systemPrompt += `\n\nREGRAS GERAIS:
        - Responda em Português do Brasil.
        - Seja conciso e direto ao ponto.
        - Se for um fluxo de QUALIFICAÇÃO, foque em coletar os atributos listados.
        - Se o cliente pedir para falar com um humano, siga as REGRAS DE TRANSBORDO.`

        // 5. Call OpenAI
        const openai = getOpenAI()
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                ...formattedHistory,
                { role: "user", content: userMessage },
            ],
            temperature: 0.7,
            max_tokens: 800,
        })

        let rawResponse = completion.choices[0]?.message?.content || "Desculpe, não consegui processar sua solicitação."

        // 6. Extract suggested label if present
        let suggestedLabel = null
        const labelMatch = rawResponse.match(/<suggested_label>(.*?)<\/suggested_label>/)
        if (labelMatch) {
            suggestedLabel = labelMatch[1].trim()
            // Clean the label tag from the message sent to the user
            rawResponse = rawResponse.replace(/<suggested_label>.*?<\/suggested_label>/g, "").trim()
        }

        // 7. Save AI Message to DB
        const savedMessage = await prisma.message.create({
            data: {
                content: rawResponse,
                sender: "AI_AGENT",
                conversationId,
                type: "text",
                fromMe: true,
                isRead: true,
            }
        })

        return {
            content: rawResponse,
            messageId: savedMessage.id,
            suggestedLabel: suggestedLabel
        }

    } catch (error) {
        console.error("AI Orchestrator Error:", error)
        throw error
    }
}
