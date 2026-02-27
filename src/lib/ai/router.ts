import OpenAI from "openai"
import { prisma } from "@/lib/prisma"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * AI Router — analyzes the first message from a lead and picks the best agent.
 * Uses GPT-4o-mini for speed and cost efficiency.
 *
 * @param accountId  The account to fetch active agents from
 * @param userMessage The first message sent by the lead
 * @returns The id of the chosen agent, or null if no suitable agent was found
 */
export async function routeToAgent(
    accountId: string,
    userMessage: string
): Promise<string | null> {
    try {
        // Fetch all active agents with their role descriptions
        const agents = await prisma.agent.findMany({
            where: { accountId, isActive: true },
            select: {
                id: true,
                name: true,
                roleDescription: true,
                communicationStyle: true,
                companyDescription: true,
            },
        })

        if (agents.length === 0) return null

        // If there's only one agent, no need to call GPT — just return it
        if (agents.length === 1) return agents[0].id

        // Build agent list for the prompt
        const agentList = agents.map((a, i) =>
            `${i + 1}. ID: "${a.id}" | Nome: "${a.name}" | Função: "${a.roleDescription}" | Estilo: "${a.communicationStyle}"`
        ).join("\n")

        const systemPrompt = `Você é um roteador inteligente de atendimento ao cliente.
Seu trabalho é analisar a primeira mensagem de um lead e decidir qual agente deve atendê-lo.

AGENTES DISPONÍVEIS:
${agentList}

INSTRUÇÕES:
- Analise a intenção, tom e conteúdo da mensagem do lead.
- Escolha o agente MAIS adequado com base na função e estilo de cada um.
- Responda APENAS com o ID do agente escolhido, sem explicações, sem aspas, sem formatação.
- Se nenhum agente for claramente melhor, escolha o primeiro da lista.`

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Mensagem do lead: "${userMessage}"` },
            ],
            temperature: 0.1,
            max_tokens: 60,
        })

        const rawChoice = completion.choices[0]?.message?.content?.trim() || ""

        // Validate the returned ID is actually one of our agents
        const chosen = agents.find((a) => a.id === rawChoice)

        if (chosen) {
            console.log(`[AI Router] Roteado para: "${chosen.name}" (${chosen.id})`)
            return chosen.id
        }

        // Fallback: return first agent
        console.warn(`[AI Router] GPT returned unknown id "${rawChoice}", falling back to first agent.`)
        return agents[0].id

    } catch (err) {
        console.error("[AI Router] Routing failed:", err)
        return null
    }
}
