import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const { remoteJid } = await req.json()
        if (!remoteJid) return NextResponse.json({ error: 'Missing remoteJid' }, { status: 400 })

        // 1. Reset unread count directly in Prisma (CRM side)
        await prisma.conversation.updateMany({
            where: { whatsappJid: remoteJid },
            data: { unreadCount: 0 }
        })

        // Fetch the unread messages for this chat to sync with WhatsApp
        const unreadMessages = await prisma.message.findMany({
            where: {
                whatsappJid: remoteJid,
                isRead: false,
                fromMe: false
            },
            select: { whatsappId: true }
        })

        if (unreadMessages.length > 0) {
            // Mark as read internally
            await prisma.message.updateMany({
                where: { whatsappJid: remoteJid, isRead: false },
                data: { isRead: true }
            })

            // 2. Call Evolution API to push the "blue ticks" to the client's phone
            const INSTANCE = process.env.EVOLUTION_INSTANCE
            const API_KEY = process.env.EVOLUTION_API_KEY
            const API_URL = process.env.EVOLUTION_API_URL

            if (INSTANCE && API_KEY && API_URL) {
                const readPayload = {
                    readMessages: unreadMessages.map((m: { whatsappId: string | null }) => ({
                        remoteJid,
                        fromMe: false,
                        id: m.whatsappId
                    }))
                }

                console.log(`[Mark As Read] Sending payload to Evolution: ${JSON.stringify(readPayload)}`)

                const evoRes = await fetch(`${API_URL}/chat/markMessageAsRead/${INSTANCE}`, {
                    method: 'POST',
                    headers: {
                        'apikey': API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(readPayload)
                })

                if (!evoRes.ok) {
                    const errorText = await evoRes.text()
                    console.error('[Evolution API] Failed to mark as read:', errorText)
                } else {
                    console.log('[Evolution API] Mark as read successful')
                }
            }
        }

        return NextResponse.json({ success: true })
    } catch (e) {
        console.error('[Mark As Read] Error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
