const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
    console.log("Fetching unread messages...");
    const unread = await prisma.message.findMany({
        where: {
            isRead: false,
            fromMe: false
        },
        select: { whatsappId: true, whatsappJid: true }
    });
    console.log(unread);
    process.exit(0);
}
test();
