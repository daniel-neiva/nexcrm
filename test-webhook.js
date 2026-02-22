const http = require('http');

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    console.log(`\n\n[INCOMING WEBHOOK] ${new Date().toISOString()}`);
    console.log(`${req.method} ${req.url}`);
    if (body) {
      try {
        console.log(JSON.stringify(JSON.parse(body), null, 2));
      } catch (e) {
        console.log("Raw Body:", body);
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  });
});

server.listen(5050, () => {
  console.log("Listening for webhooks on port 5050...");
});
