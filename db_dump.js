const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
    console.log("--- CONVERSATIONS ---")
    const convs = await prisma.conversation.findMany({ select: { id: true, whatsappJid: true, unreadCount: true } })
    console.log(convs)

    console.log("\n--- CONTACTS ---")
    const contacts = await prisma.contact.findMany({ select: { id: true, phone: true, name: true, avatarUrl: true } })
    console.log(contacts)
    process.exit(0)
}
test()
