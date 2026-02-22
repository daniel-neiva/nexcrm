const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
    const contacts = await prisma.contact.findMany({
        where: { phone: { contains: "5511993278566" } },
        select: { id: true, name: true, phone: true, avatarUrl: true }
    });
    console.log("Contacts:", contacts);

    console.log("Testing update...");
    const res = await prisma.contact.updateMany({
        where: { phone: "5511993278566@s.whatsapp.net" },
        data: { avatarUrl: "https://example.com/test.jpg" }
    });
    console.log("Update result:", res);

    process.exit(0);
}
test();
