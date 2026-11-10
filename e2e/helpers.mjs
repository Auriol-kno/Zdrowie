import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const { chromium } = require('playwright');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
export function serve(port = 0) {
  return new Promise((res) => {
    const s = createServer(async (req, rsp) => {
      let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (p.endsWith('/')) p += 'index.html';
      try { const b = await readFile(join('dist', p)); rsp.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' }); rsp.end(b); } catch { rsp.writeHead(404); rsp.end('404'); }
    }).listen(port, () => res({ server: s, url: `http://localhost:${s.address().port}/` }));
  });
}
export const IPHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };
