import { getBase64FromMedia } from '@/lib/evolution'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { messageId, remoteJid, fromMe } = body

        if (!messageId || !remoteJid) {
            return NextResponse.json({ error: 'messageId and remoteJid are required' }, { status: 400 })
        }

        const result = await getBase64FromMedia(messageId, remoteJid, fromMe ?? false)

        if (result?.base64) {
            const mimetype = result.mimetype || 'application/octet-stream'
            const buffer = Buffer.from(result.base64, 'base64')

            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': mimetype,
                    'Content-Length': buffer.length.toString(),
                    'Cache-Control': 'public, max-age=86400',
                },
            })
        }

        return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    } catch (error) {
        console.error('Media Download Error:', error)
        return NextResponse.json({ error: 'Erro ao baixar mídia' }, { status: 500 })
    }
}
