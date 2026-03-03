import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/apply-migration
 * Applies pending schema changes that can't be run via `prisma db push` locally.
 * Protected by auth. Idempotent — safe to call multiple times.
 */
export async function POST() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const results: string[] = []

    // Add participantJid to Message if not exists
    try {
        await prisma.$executeRawUnsafe(`
            ALTER TABLE "Message"
            ADD COLUMN IF NOT EXISTS "participantJid" TEXT,
            ADD COLUMN IF NOT EXISTS "participantPhone" TEXT
        `)
        results.push('✅ participantJid + participantPhone added to Message')
    } catch (e: any) {
        results.push(`⚠️ participantJid migration: ${e.message}`)
    }

    return NextResponse.json({ success: true, results })
}
