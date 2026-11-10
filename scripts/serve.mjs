// Prosty serwer statyczny do lokalnego podglądu dist/ (node scripts/serve.mjs [port]).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const port = Number(process.argv[2] ?? 4173);
createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  if (p.endsWith('/')) p += 'index.html';
  try { const b = await readFile(join('dist', p)); res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream', 'cache-control': p.includes('sw.js') ? 'no-cache' : 'public, max-age=300' }); res.end(b); }
  catch { res.writeHead(404); res.end('404'); }
}).listen(port, () => console.log(`http://localhost:${port}`));
