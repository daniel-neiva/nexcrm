import { supabaseAdmin } from '@/lib/supabase/admin'
import { getBase64FromMedia } from '@/lib/evolution'
import { prisma } from '@/lib/prisma'

const BUCKET = 'whatsapp-media'
const SIGNED_URL_EXPIRY = 365 * 24 * 60 * 60 // 1 year in seconds

// Map media types to file extensions
const EXT_MAP: Record<string, string> = {
    image: 'jpg',
    video: 'mp4',
    audio: 'ogg',
    document: 'bin',
    sticker: 'webp',
}

interface PersistMediaParams {
    instanceName: string
    messageId: string
    remoteJid: string
    fromMe: boolean
    mediaType: string
    fileName?: string | null
}

/**
 * Downloads media from Evolution API, uploads to Supabase Storage (private bucket),
 * and returns a signed URL.
 *
 * - **Idempotent:** checks if file exists before uploading
 * - **Non-blocking:** never throws — returns null on any failure
 * - **Deterministic naming:** `{instanceName}/{remoteJid}/{messageId}.{ext}`
 */
export async function persistMedia(params: PersistMediaParams): Promise<string | null> {
    const { instanceName, messageId, remoteJid, fromMe, mediaType, fileName } = params

    // Determine file extension
    const ext = fileName
        ? (fileName.split('.').pop() || EXT_MAP[mediaType] || 'bin')
        : (EXT_MAP[mediaType] || 'bin')

    // Deterministic path: instanceName/remoteJid/messageId.ext
    const sanitizedJid = remoteJid.replace(/[@:+]/g, '_')
    const storagePath = `${instanceName}/${sanitizedJid}/${messageId}.${ext}`

    try {
        // 1. Check if already uploaded (idempotent — no listing, just try to get signed URL)
        const { data: existingUrl } = await supabaseAdmin.storage
            .from(BUCKET)
            .createSignedUrl(storagePath, SIGNED_URL_EXPIRY)

        if (existingUrl?.signedUrl) {
            console.log(`[MediaStorage] Already exists: ${storagePath}`)
            return existingUrl.signedUrl
        }
    } catch {
        // File doesn't exist yet — proceed with upload
    }

    try {
        // 2. Download from Evolution API
        console.log(`[MediaStorage] Downloading media: ${messageId} (${mediaType})`)
        const mediaData = await getBase64FromMedia(instanceName, messageId, remoteJid, fromMe)

        if (!mediaData?.base64) {
            console.warn(`[MediaStorage] No base64 returned for ${messageId}. Instance: ${instanceName}`)
            return null
        }

        // 3. Convert base64 to Buffer
        // Evolution returns data:mimetype;base64,DATA or just raw base64
        const base64Clean = mediaData.base64.includes(',')
            ? mediaData.base64.split(',')[1]
            : mediaData.base64

        const buffer = Buffer.from(base64Clean, 'base64')
        const contentType = mediaData.mimetype || `application/octet-stream`

        // 4. Upload to Supabase Storage (private bucket, no upsert — idempotent via path)
        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(storagePath, buffer, {
                contentType,
                upsert: false, // Don't overwrite — deterministic path means same file
            })

        if (uploadError) {
            // If duplicate, it's OK — just fetch the URL
            if (uploadError.message?.includes('already exists') || uploadError.message?.includes('Duplicate')) {
                console.log(`[MediaStorage] Duplicate detected: ${storagePath}`)
            } else {
                console.error(`[MediaStorage] Upload failed for ${storagePath}:`, uploadError.message)
                return null
            }
        } else {
            console.log(`[MediaStorage] Uploaded: ${storagePath} (${buffer.length} bytes)`)
        }

        // 5. Generate signed URL
        const { data: signedData, error: signError } = await supabaseAdmin.storage
            .from(BUCKET)
            .createSignedUrl(storagePath, SIGNED_URL_EXPIRY)

        if (signError || !signedData?.signedUrl) {
            console.error(`[MediaStorage] Signed URL failed for ${storagePath}:`, signError?.message)
            return null
        }

        return signedData.signedUrl
    } catch (error: any) {
        console.error(`[MediaStorage] Error persisting media ${messageId}:`, error.message)
        return null
    }
}

/**
 * Persists media for a message and updates the fileUrl in the database.
 * Called from `after()` in the processor — non-blocking.
 */
export async function persistAndSaveMedia(
    dbMessageId: string,
    params: PersistMediaParams
): Promise<void> {
    const url = await persistMedia(params)
    if (url) {
        await prisma.message.update({
            where: { id: dbMessageId },
            data: {
                fileUrl: url,
                fileName: params.fileName || null,
            }
        })
        console.log(`[MediaStorage] Saved fileUrl for message ${dbMessageId}`)
    }
}
