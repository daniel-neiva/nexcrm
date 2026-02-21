const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || ''
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || ''

async function evolutionFetch<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${EVOLUTION_API_URL}${endpoint}`

    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            apikey: EVOLUTION_API_KEY,
            ...options.headers,
        },
    })

    if (!res.ok) {
        const errorText = await res.text()
        console.error(`Evolution API Error [${res.status}]: ${errorText}`)
        throw new Error(`Evolution API Error: ${res.status}`)
    }

    return res.json()
}

// ===== Instance =====

export async function getInstanceInfo() {
    return evolutionFetch(`/instance/fetchInstances?instanceName=${EVOLUTION_INSTANCE}`)
}

export async function getInstanceStatus() {
    return evolutionFetch(`/instance/connectionState/${EVOLUTION_INSTANCE}`)
}

// ===== Messages =====

export async function sendTextMessage(number: string, text: string) {
    return evolutionFetch(`/message/sendText/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        body: JSON.stringify({ number, text }),
    })
}

export async function sendMediaMessage(
    number: string,
    mediaUrl: string,
    caption?: string,
    mediaType: 'image' | 'video' | 'audio' | 'document' = 'image'
) {
    return evolutionFetch(`/message/sendMedia/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        body: JSON.stringify({ number, mediatype: mediaType, media: mediaUrl, caption }),
    })
}

// ===== Contacts =====

export async function getContacts() {
    return evolutionFetch<Array<{
        id: string
        pushName?: string
        remoteJid: string
        profilePictureUrl?: string | null
    }>>(`/chat/findContacts/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        body: JSON.stringify({}),
    })
}

// ===== Chats =====

export async function getChats() {
    return evolutionFetch<Array<Record<string, unknown>>>(`/chat/findChats/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        body: JSON.stringify({}),
    })
}

export async function getMessages(remoteJid: string, count: number = 50) {
    return evolutionFetch(`/chat/findMessages/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        body: JSON.stringify({
            where: { key: { remoteJid } },
            limit: count,
        }),
    })
}

// ===== Groups =====

export async function getGroups() {
    return evolutionFetch<Array<{
        id: string
        subject: string
        subjectOwner?: string
        subjectTime?: number
        size: number
        creation?: number
        desc?: string
        profilePictureUrl?: string | null
    }>>(`/group/fetchAllGroups/${EVOLUTION_INSTANCE}?getParticipants=false`)
}

// ===== Media =====

export async function getBase64FromMedia(messageId: string, remoteJid: string, fromMe: boolean) {
    return evolutionFetch<{ base64: string; mimetype: string; fileName?: string }>(
        `/chat/getBase64FromMediaMessage/${EVOLUTION_INSTANCE}`,
        {
            method: 'POST',
            body: JSON.stringify({
                message: {
                    key: {
                        id: messageId,
                        remoteJid,
                        fromMe,
                    },
                },
                convertToMp4: false,
            }),
        }
    )
}

// ===== Profile Picture =====

export async function getProfilePicture(number: string) {
    try {
        return await evolutionFetch<{ profilePictureUrl?: string }>(
            `/chat/fetchProfilePictureUrl/${EVOLUTION_INSTANCE}`,
            {
                method: 'POST',
                body: JSON.stringify({ number }),
            }
        )
    } catch {
        return { profilePictureUrl: null }
    }
}

// ===== Webhook =====

export async function setWebhook(webhookUrl: string) {
    return evolutionFetch(`/webhook/set/${EVOLUTION_INSTANCE}`, {
        method: 'POST',
        body: JSON.stringify({
            webhook: {
                enabled: true,
                url: webhookUrl,
                webhookByEvents: false,
                webhookBase64: false,
                events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'SEND_MESSAGE', 'CONNECTION_UPDATE'],
            },
        }),
    })
}

// ===== Utility =====

export function formatPhoneNumber(jid: string): string {
    return jid.replace('@s.whatsapp.net', '').replace('@g.us', '').replace('@lid', '')
}

export function toWhatsAppJid(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    return `${cleaned}@s.whatsapp.net`
}

export function isGroupJid(jid: string): boolean {
    return jid.endsWith('@g.us')
}

export function isLidJid(jid: string): boolean {
    return jid.endsWith('@lid')
}

export { EVOLUTION_INSTANCE }
