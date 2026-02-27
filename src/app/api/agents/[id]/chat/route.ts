import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { processAgentMessage } from "@/lib/ai/orchestrator"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: agentId } = await params
        const { message, conversationId, contactId } = await req.json()

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
        }

        // 1. Ensure/Find User in Prisma
        const dbUser = await prisma.user.findUnique({
            where: { authId: user.id }
        })

        if (!dbUser) {
            return NextResponse.json({ error: "Usuário não sincronizado" }, { status: 404 })
        }

        let targetConversationId = conversationId

        // 2. If no conversationId provided, find or create one for the contact
        if (!targetConversationId && contactId) {
            const conversation = await prisma.conversation.findFirst({
                where: {
                    contactId,
                    accountId: dbUser.accountId,
                    status: "OPEN"
                }
            })

            if (conversation) {
                targetConversationId = conversation.id
            } else {
                const newConv = await prisma.conversation.create({
                    data: {
                        contactId,
                        accountId: dbUser.accountId,
                        status: "OPEN",
                        agentId: agentId,
                    }
                })
                targetConversationId = newConv.id
            }
        }

        if (!targetConversationId) {
            return NextResponse.json({ error: "Conversation ID ou Contact ID obrigatório" }, { status: 400 })
        }

        // 3. Save User Message to DB first
        await prisma.message.create({
            data: {
                content: message,
                sender: "CONTACT", // Simulating the contact for test purposes or coming from UI
                conversationId: targetConversationId,
                type: "text",
                fromMe: false,
            }
        })

        // 4. Call Orchestrator to get AI response
        const result = await processAgentMessage(agentId, targetConversationId, message)

        return NextResponse.json({
            success: true,
            response: result.content,
            messageId: result.messageId
        })

    } catch (error: any) {
        console.error("Agent Chat API Error:", error)
        return NextResponse.json({ error: error.message || "Erro ao processar chat" }, { status: 500 })
    }
}
