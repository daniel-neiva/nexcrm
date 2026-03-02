const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runBackfill() {
    const apiKey = '429683C4C977415CAAFCCE10F7D57E11';
    const instance = 'daniel-comercial';
    const evoApiUrl = 'https://evo.danielneiva.ovh';

    // Backfill threshold (approx 2.5 days ago)
    const sinceTimestamp = Math.floor(Date.now() / 1000) - (2.5 * 24 * 60 * 60);

    console.log('Fetching active chats from Evolution API...');
    const chatsRes = await fetch(`${evoApiUrl}/chat/findChats/${instance}`, {
        method: 'POST',
        headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });

    const chats = await chatsRes.json();
    const records = Array.isArray(chats) ? chats : (chats.records || []);
    console.log(`Found ${records.length} total chats in Evolution.`);

    const recentChats = records.filter(c => c.remoteJid && c.remoteJid.includes('@')).slice(0, 200);

    console.log(`Checking Top ${recentChats.length} active chats for missing messages...`);

    const inbox = await prisma.inbox.findFirst({ where: { instanceName: instance } });
    if (!inbox) return console.log("Inbox not found in DB!");

    let totalUpserted = 0;

    for (const chat of recentChats) {
        const remoteJid = chat.remoteJid;
        if (remoteJid === '120363280409766321@g.us') continue; // We already fixed Piselli group

        const msgsRes = await fetch(`${evoApiUrl}/chat/findMessages/${instance}`, {
            method: 'POST',
            headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                where: { key: { remoteJid } }
            })
        });

        if (!msgsRes.ok) continue;

        const messagesResp = await msgsRes.json();
        let msgs = [];
        if (messagesResp.messages && Array.isArray(messagesResp.messages.records)) {
            msgs = messagesResp.messages.records;
        } else if (Array.isArray(messagesResp)) {
            msgs = messagesResp;
        } else if (Array.isArray(messagesResp.records)) {
            msgs = messagesResp.records;
        }

        if (msgs.length === 0) continue;

        const newMsgs = msgs; // Take all found messages from the Evolution query

        if (newMsgs.length > 0) {
            console.log(`Syncing ${newMsgs.length} messages for chat ${remoteJid}...`);

            // Ensure Contact exists
            let contact = await prisma.contact.findFirst({ where: { phone: remoteJid } });
            if (!contact) {
                contact = await prisma.contact.create({
                    data: { accountId: inbox.accountId, name: chat.pushName || remoteJid, phone: remoteJid }
                });
            }

            // Ensure Conversation exists
            let conversation = await prisma.conversation.findFirst({ where: { whatsappJid: remoteJid, inboxId: inbox.id } });
            if (!conversation) {
                conversation = await prisma.conversation.create({
                    data: {
                        whatsappJid: remoteJid, accountId: inbox.accountId, inboxId: inbox.id,
                        contactId: contact.id, channel: 'WHATSAPP', status: 'OPEN',
                        unreadCount: 0, aiEnabled: true
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

                if (!content && type === 'text') content = 'Mensagem original de sistema do WhatsApp';

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
                            inboxId: inbox.id,
                            createdAt: new Date(msg.messageTimestamp * 1000)
                        },
                        update: {}
                    });
                    totalUpserted++;
                } catch (e) { }
            }
        }
    }

    console.log(`Universal Sync complete! Pushed ${totalUpserted} missing messages across all chats.`);
}

runBackfill().finally(() => prisma.$disconnect());
