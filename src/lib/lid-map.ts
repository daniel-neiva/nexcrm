/**
 * LID → Phone mapping using Supabase REST API.
 * Uses the service_role key so it can bypass RLS and do DDL.
 * 
 * Table is created on first use via the /rest/v1/lid_phone_map endpoint.
 * If the table doesn't exist, we gracefully fall back to memory-only mode.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function supabaseHeaders() {
    return {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=minimal',
    }
}

// In-memory cache — avoids DB hit on every request
let cache: Record<string, string> = {}
let cacheLoaded = false

/**
 * Load all LID mappings from Supabase into memory.
 */
export async function loadLidMap(): Promise<Record<string, string>> {
    if (cacheLoaded) return cache

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/lid_phone_map?select=lid,phone`, {
            headers: supabaseHeaders(),
            cache: 'no-store',
        })

        if (res.ok) {
            const rows: Array<{ lid: string; phone: string }> = await res.json()
            cache = {}
            for (const row of rows) {
                if (row.lid && row.phone) cache[row.lid] = row.phone
            }
        }
    } catch (err) {
        console.warn('[LID Map] Could not load:', err)
    }

    cacheLoaded = true
    return cache
}

/**
 * Store a LID → phone number mapping.
 */
export async function setLidPhone(lidJid: string, phone: string): Promise<void> {
    const lid = lidJid.replace('@lid', '')
    if (!phone || phone === lid) return

    // Update cache immediately
    cache[lid] = phone

    try {
        await fetch(`${SUPABASE_URL}/rest/v1/lid_phone_map`, {
            method: 'POST',
            headers: {
                ...supabaseHeaders(),
                'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify({ lid, phone }),
        })
    } catch (err) {
        console.error('[LID Map] Save error:', err)
    }
}

/**
 * Get the phone number for a LID (sync, from cache).
 */
export function getLidPhone(lidJid: string): string | null {
    const lid = lidJid.replace('@lid', '')
    return cache[lid] || null
}

/**
 * Get all mappings from the in-memory cache.
 */
export function getAllLidMappings(): Record<string, string> {
    return cache
}
