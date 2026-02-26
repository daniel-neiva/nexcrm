const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
    try {
        console.log("Checking accounts...")
        let account = await prisma.account.findFirst()
        console.log("Found:", account?.id)
        if (!account) {
            console.log("Creating account...")
            account = await prisma.account.create({
                data: { name: 'Conta Principal', plan: 'pro' }
            })
            console.log("Created:", account?.id)
        }
        
        let contact = await prisma.contact.findFirst({
            where: { phone: '5511993278566@s.whatsapp.net', accountId: account.id }
        });
        if (!contact) {
            contact = await prisma.contact.create({
                data: {
                    accountId: account.id,
                    name: 'Daniel Test',
                    phone: '5511993278566@s.whatsapp.net',
                }
            });
        }
        console.log("Contact:", contact?.id);
        
        let conversation = await prisma.conversation.findUnique({
            where: { whatsappJid: '5511993278566@s.whatsapp.net' }
        });
        if (!conversation) {
            conversation = await prisma.conversation.create({
                data: {
                    whatsappJid: '5511993278566@s.whatsapp.net',
                    accountId: account.id,
                    contactId: contact.id,
                    channel: 'WHATSAPP',
                    status: 'OPEN',
                    unreadCount: 1
                }
            });
        }
        console.log("Conversation:", conversation?.id);

    } catch (e) {
        console.error("PRISMA ERROR:", e)
    } finally {
        await prisma.$disconnect()
    }
}
test()
