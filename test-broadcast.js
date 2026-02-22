const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log('Sending broadcast...');

    await new Promise((resolve) => {
        const channel = supabaseAdmin.channel('whatsapp_updates');
        channel.subscribe(async (status) => {
            console.log('Status:', status);
            if (status === 'SUBSCRIBED') {
                await channel.send({
                    type: 'broadcast',
                    event: 'new_message',
                    payload: { test: true }
                });
                console.log('Sent!');
                supabaseAdmin.removeChannel(channel);
                resolve(true);
            }
        });
        setTimeout(() => {
            console.log('Timeout');
            resolve(false);
        }, 5000);
    });

    console.log('Done');
    process.exit(0);
}
run();
