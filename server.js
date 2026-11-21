// Zero-dependency static server. Run: node server.js  (serves ./dist if present, else this folder)
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = fs.existsSync(path.join(__dirname, 'dist')) ? path.join(__dirname, 'dist') : __dirname;
const port = process.env.PORT || 8080;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ico': 'image/x-icon',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
        res.writeHead(400).end('Bad request');
        return;
    }
    const safe = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    let file = path.join(root, safe);
    if (!file.startsWith(root)) {
        res.writeHead(403).end('Forbidden');
        return;
    }
    try {
        if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
        if (!fs.statSync(file).isFile()) file = path.join(root, 'index.html');
    } catch {
        file = path.join(root, 'index.html');
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    const stream = fs.createReadStream(file);
    stream.on('error', () => res.end());
    stream.pipe(res);
}).listen(port, () => {
    console.log('HU Trader running at http://localhost:' + port + '/  (serving ' + root + ')');
});