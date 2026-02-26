const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
    console.log("Starting Retroactive Message Fix...");

    try {
        const brokenLocalMsgs = await prisma.message.findMany({
            where: {
                content: {
                    contains: "Mensagem de sistema"
                }
            }
        });

        console.log(`Found ${brokenLocalMsgs.length} "Mensagem de sistema" broken records in the SQL Database.`);

        let fixedCount = 0;
        const jidsWithBrokenMsgs = [...new Set(brokenLocalMsgs.map(m => m.whatsappJid))];

        for (const jid of jidsWithBrokenMsgs) {
            console.log(`Fetching true message history for ${jid} from Evolution...`);
            const msgRes = await fetch('https://nexcrm-0-9-evolution-api.qxanqi.easypanel.host/chat/findMessages/daniel-comercial', {
                method: 'POST',
                headers: {
                    apikey: '767019129A72-4075-97A1-C59938E9C428',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ where: { key: { remoteJid: jid } } })
            });

            const msgJson = await msgRes.json();
            let remoteMsgs = [];

            if (Array.isArray(msgJson)) {
                remoteMsgs = msgJson;
            } else if (msgJson.records && Array.isArray(msgJson.records)) {
                remoteMsgs = msgJson.records;
            } else if (msgJson.messages && msgJson.messages.records) {
                remoteMsgs = msgJson.messages.records;
            }

            const jidLocalBroken = brokenLocalMsgs.filter(m => m.whatsappJid === jid);

            for (const local of jidLocalBroken) {
                const remote = remoteMsgs.find(rm => rm.key?.id === local.whatsappId);
                if (remote && remote.message) {
                    const m = remote.message;

                    let trueContent = Object.values(m || {}).length === 0 ? '' : (
                        (m.conversation) ||
                        (m.extendedTextMessage?.text) ||
                        (m.imageMessage?.caption) ||
                        (m.videoMessage?.caption) ||
                        (m.documentWithCaptionMessage?.message?.documentMessage?.caption) ||
                        (m.documentMessage?.fileName) ||
                        (m.buttonsResponseMessage?.selectedDisplayText) ||
                        (m.listResponseMessage?.title) ||
                        (m.templateButtonReplyMessage?.selectedDisplayText) ||
                        (m.templateMessage?.interactiveMessageTemplate?.body?.text) ||
                        (m.templateMessage?.hydratedTemplate?.bodyText) ||
                        (m.templateMessage?.hydratedTemplate?.hydratedContentText) ||
                        (m.templateMessage?.hydratedFourRowTemplate?.hydratedContentText) ||
                        (m.viewOnceMessage?.message?.imageMessage?.caption) ||
                        (m.viewOnceMessage?.message?.videoMessage?.caption) ||
                        (m.viewOnceMessageV2?.message?.imageMessage?.caption) ||
                        (m.viewOnceMessageV2?.message?.videoMessage?.caption) ||
                        ''
                    );

                    let hasMedia = false;
                    let type = local.type;

                    const imgNode = m?.imageMessage || m?.viewOnceMessage?.message?.imageMessage || m?.viewOnceMessageV2?.message?.imageMessage || m?.templateMessage?.interactiveMessageTemplate?.header?.imageMessage || m?.templateMessage?.hydratedTemplate?.imageMessage;
                    const vidNode = m?.videoMessage || m?.viewOnceMessage?.message?.videoMessage || m?.viewOnceMessageV2?.message?.videoMessage || m?.templateMessage?.interactiveMessageTemplate?.header?.videoMessage || m?.templateMessage?.hydratedTemplate?.videoMessage;
                    const docNode = m?.documentMessage || m?.documentWithCaptionMessage?.message?.documentMessage || m?.templateMessage?.interactiveMessageTemplate?.header?.documentMessage || m?.templateMessage?.hydratedTemplate?.documentMessage;

                    if (imgNode) {
                        type = 'image'; hasMedia = true; if (!trueContent) trueContent = '📷 Imagem';
                    } else if (vidNode) {
                        type = 'video'; hasMedia = true; if (!trueContent) trueContent = '🎬 Vídeo';
                    } else if (m?.audioMessage) {
                        type = 'audio'; hasMedia = true; if (!trueContent) trueContent = '🎵 Áudio';
                    } else if (docNode) {
                        type = 'document'; hasMedia = true; if (!trueContent) trueContent = '📄 Documento';
                    }

                    if (trueContent && trueContent !== "Mensagem de sistema ou mídia não suportada") {
                        await prisma.message.update({
                            where: { id: local.id },
                            data: {
                                content: trueContent,
                                type: type
                            }
                        });
                        fixedCount++;
                        console.log(`[FIXED] Extracted legacy text for ${local.whatsappId}: ${trueContent.substring(0, 30)}...`);
                    }
                }
            }
        }

        console.log(`\n✅ Backfill completed! Fixed ${fixedCount} legacy broken messages in the local SQL database.`);

    } catch (e) {
        console.error("Fatal Error during backfill:", e);
    }
}

backfill();
