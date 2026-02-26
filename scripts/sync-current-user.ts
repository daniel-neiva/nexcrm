import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const authId = '86d4c2c8-641b-43f0-ad6b-ed520d1c4aaf'
    const email = 'danielneiva.design@gmail.com'
    const accountId = 'cmlzea70s00009s6s61zrlv6i' // ID from previous check

    console.log(`Syncing user: ${email} with authId: ${authId}`)

    const user = await prisma.user.upsert({
        where: { authId: authId },
        update: {
            role: 'ADMIN',
            accountId: accountId
        },
        create: {
            authId: authId,
            email: email,
            name: 'Daniel Neiva',
            role: 'ADMIN',
            accountId: accountId,
            status: 'ONLINE'
        }
    })

    console.log('--- SYNC COMPLETE ---')
    console.log(JSON.stringify(user, null, 2))
    console.log('----------------------')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
