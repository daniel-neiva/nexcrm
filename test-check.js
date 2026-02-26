const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function check() {
    try {
        const msg = await prisma.message.findUnique({ where: { whatsappId: 'TEST-WEBHOOK-999' } });
        console.log("Found Message:", msg);
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect();
    }
}
check();
