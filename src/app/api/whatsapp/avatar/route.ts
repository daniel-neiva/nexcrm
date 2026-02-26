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
                const existingContact = await prisma.contact.findFirst({
                    where: {
                        OR: [
                            { phone: number },
                            { phone: number.replace('@s.whatsapp.net', '') }
                        ]
                    }
                })

                if (existingContact) {
                    await prisma.contact.update({
                        where: { id: existingContact.id },
                        data: { avatarUrl: profilePictureUrl }
                    })
                } else {
                    let account = await prisma.account.findFirst();
                    if (!account) {
                        account = await prisma.account.create({ data: { name: 'Conta Principal', plan: 'pro' } });
                    }

                    // Create a placeholder contact so the avatar persists
                    await prisma.contact.create({
                        data: {
                            accountId: account.id,
                            name: number.includes('@') ? number.split('@')[0] : number,
                            phone: number,
                            avatarUrl: profilePictureUrl
                        }
                    })
                }
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
