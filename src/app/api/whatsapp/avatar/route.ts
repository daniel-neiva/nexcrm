import { NextRequest, NextResponse } from 'next/server'
import { getProfilePicture } from '@/lib/evolution'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const number = searchParams.get('jid')

        if (!number) {
            return NextResponse.json({ error: 'jid is required' }, { status: 400 })
        }

        const data = await getProfilePicture(number)
        const profilePictureUrl = data?.profilePictureUrl || null

        if (profilePictureUrl) {
            try {
                // Save to Prisma cache
                await prisma.contact.updateMany({
                    where: {
                        OR: [
                            { phone: number },
                            { phone: number.replace('@s.whatsapp.net', '') }
                        ]
                    },
                    data: { avatarUrl: profilePictureUrl }
                })
            } catch (e) {
                console.error('Error saving avatar to DB', e)
            }
        }

        return NextResponse.json({ profilePictureUrl })
    } catch (error) {
        console.error('WhatsApp Avatar API Error:', error)
        return NextResponse.json({ profilePictureUrl: null })
    }
}
