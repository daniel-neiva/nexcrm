import { prisma } from '@/lib/prisma'
import { evolutionFetch } from '@/lib/evolution'

export async function syncInboxHistory(inboxId: string, accountId: string, instanceName: string) {
    try {
        console.log(`[AutoSync] Starting history sync for Inbox: ${instanceName}`);

        // 1. Get recent chats
        const chats = await evolutionFetch<any>(`/chat/findChats/${instanceName}`, { method: 'POST', body: JSON.stringify({}) });
        const records = Array.isArray(chats) ? chats : (chats?.records || []);

        // Take top 500 active chats
        const recentChats = records.filter((c: any) => c.remoteJid && c.remoteJid.includes('@')).slice(0, 500);
        console.log(`[AutoSync] Found ${recentChats.length} active chats to sync for ${instanceName}`);

        let totalUpserted = 0;

        for (const chat of recentChats) {
            const remoteJid = chat.remoteJid;

            // 2. Fetch last 20 messages for each chat
            const msgsRes = await evolutionFetch<any>(`/chat/findMessages/${instanceName}`, {
                method: 'POST',
                body: JSON.stringify({ where: { key: { remoteJid } } })
            });

            let msgs: any[] = [];
            if (msgsRes?.messages?.records) msgs = msgsRes.messages.records;
            else if (Array.isArray(msgsRes)) msgs = msgsRes;
            else if (Array.isArray(msgsRes?.records)) msgs = msgsRes.records;

            if (msgs.length === 0) continue;

            const newMsgs = msgs;

            if (newMsgs.length > 0) {
                // Ensure Contact exists
                let contact = await prisma.contact.findFirst({ where: { phone: remoteJid, accountId } });
                if (!contact) {
                    contact = await prisma.contact.create({
                        data: { accountId, name: chat.pushName || remoteJid, phone: remoteJid }
                    });
                }

                // Ensure Conversation exists
                let conversation = await prisma.conversation.findUnique({
                    where: { whatsappJid_inboxId: { whatsappJid: remoteJid, inboxId } }
                });

                if (!conversation) {
                    conversation = await prisma.conversation.create({
                        data: {
                            whatsappJid: remoteJid,
                            accountId,
                            inboxId,
                            contactId: contact.id,
                            channel: 'WHATSAPP',
                            status: 'OPEN',
                            unreadCount: 0,
                            aiEnabled: true
                        }
                    });
                }

                for (let msg of newMsgs) {
                    if (msg.message && msg.message.key && !msg.key) msg = msg.message;

                    const key = msg.key || {};
                    const messageId = key.id || msg.messageId;
                    if (!messageId) continue;

                    const fromMe = key.fromMe || false;
                    const m = msg.message || {};

                    let content = Object.values(m || {}).length === 0 ? '' : (
                        (m?.conversation) || (m?.extendedTextMessage?.text) ||
                        (m?.imageMessage?.caption) || (m?.videoMessage?.caption) ||
                        (m?.documentWithCaptionMessage?.message?.documentMessage?.caption) ||
                        (m?.interactiveMessage?.body?.text) || (m?.buttonsResponseMessage?.selectedDisplayText) ||
                        ''
                    );

                    let type = 'text';
                    if (m?.imageMessage || m?.viewOnceMessage?.message?.imageMessage) { type = 'image'; if (!content) content = '📷 Imagem'; }
                    else if (m?.videoMessage || m?.viewOnceMessage?.message?.videoMessage) { type = 'video'; if (!content) content = '🎬 Vídeo'; }
                    else if (m?.audioMessage) { type = 'audio'; if (!content) content = '🎵 Áudio'; }
                    else if (m?.documentMessage || m?.documentWithCaptionMessage?.message?.documentMessage) { type = 'document'; if (!content) content = '📄 Documento'; }
                    else if (m?.stickerMessage) { type = 'sticker'; if (!content) content = '🏷️ Figurinha'; }

                    if (!content && type === 'text') content = 'Mensagem de sistema ou mídia não suportada';

                    try {
                        await prisma.message.upsert({
                            where: { id: messageId },
                            create: {
                                id: messageId,
                                whatsappId: messageId,
                                whatsappJid: remoteJid,
                                content: content,
                                type: type,
                                fromMe: fromMe,
                                isRead: fromMe,
                                sender: fromMe ? 'AGENT' : 'CONTACT',
                                senderName: chat.pushName || 'Contato',
                                conversationId: conversation.id,
                                inboxId: inboxId,
                                createdAt: new Date(msg.messageTimestamp * 1000)
                            },
                            update: {}
                        });
                        totalUpserted++;
                    } catch (e) {
                        // Probably exists or race condition
                    }
                }
            }
        }

        console.log(`[AutoSync] Completed for ${instanceName}. Upserted ${totalUpserted} messages.`);
        return { success: true, count: totalUpserted };

    } catch (error) {
        console.error(`[AutoSync] Failed for ${instanceName}:`, error);
        return { success: false, error: String(error) };
    }
}
