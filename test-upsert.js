const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testUpsert() {
    try {
        let account = await prisma.account.findFirst();

        let conversation = await prisma.conversation.findUnique({
            where: { whatsappJid: '5511993278566@s.whatsapp.net' }
        });

        console.log('Testing UPSERT message...', conversation.id);
        const savedMessage = await prisma.message.upsert({
            where: { whatsappId: 'TEST-WEBHOOK-CRASH' },
            create: {
                whatsappId: 'TEST-WEBHOOK-CRASH',
                whatsappJid: '5511993278566@s.whatsapp.net',
                content: 'Test message',
                type: 'text',
                fromMe: false,
                sender: 'CONTACT',
                senderName: 'Vercel Logs',
                conversationId: conversation.id,
                isRead: false,
            },
            update: {}
        });
        console.log('Saved message:', savedMessage?.id);
    } catch (e) {
        console.error('CRASH:', e);
    } finally {
        await prisma.$disconnect()
    }
}
testUpsert();
