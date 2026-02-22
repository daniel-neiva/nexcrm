const fs = require('fs');
const { execSync } = require('child_process');
const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/^DATABASE_URL=(.*)$/m);
if (match) {
  let url = match[1].trim();
  if (url.startsWith('"') && url.endsWith('"')) url = url.slice(1, -1);
  console.log('Running prisma migrate with extracted URL...');
  execSync('npx prisma migrate dev --name add_whatsapp_sync_fields', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit'
  });
} else {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}
