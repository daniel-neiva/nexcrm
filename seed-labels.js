// Seed default pipeline labels
// Run: node seed-labels.js

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DEFAULT_LABELS = [
    { name: 'Novo Lead', color: '#EAB308', description: 'Lead que acabou de entrar' },
    { name: 'Em Atendimento', color: '#3B82F6', description: 'Lead sendo atendido' },
    { name: 'Proposta Enviada', color: '#8B5CF6', description: 'Proposta comercial enviada' },
    { name: 'Fechado', color: '#22C55E', description: 'Negócio fechado com sucesso' },
    { name: 'Perdido', color: '#EF4444', description: 'Lead perdido / não converteu' },
]

async function seed() {
    // Find the first account
    const account = await prisma.account.findFirst()
    if (!account) {
        console.error('No account found. Create an account first.')
        process.exit(1)
    }

    console.log(`Seeding labels for account: ${account.name} (${account.id})`)

    for (const label of DEFAULT_LABELS) {
        const existing = await prisma.label.findFirst({
            where: { accountId: account.id, name: label.name }
        })
        if (existing) {
            console.log(`  ⏩ "${label.name}" already exists, skipping.`)
            continue
        }
        await prisma.label.create({
            data: { ...label, accountId: account.id }
        })
        console.log(`  ✅ Created "${label.name}"`)
    }

    console.log('Done!')
    await prisma.$disconnect()
}

seed().catch(console.error)
