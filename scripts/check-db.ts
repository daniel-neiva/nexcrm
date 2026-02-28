import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const inboxes = await prisma.inbox.findMany()
    console.log('--- INBOXES ---')
    console.log(JSON.stringify(inboxes, null, 2))

    const rawEvents = await prisma.whatsappEventRaw.findMany({
        orderBy: { receivedAt: 'desc' },
        take: 5
    })
    console.log('--- RAW EVENTS (LATEST 5) ---')
    console.log(JSON.stringify(rawEvents, null, 2))
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
