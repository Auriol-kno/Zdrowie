// Build: esbuild (bundle + minify) → dist/, hashowane zasoby, ikony PNG (sharp), service worker z precache.
import { build, context } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const watch = process.argv.includes('--watch');
const OUT = 'dist';
const VERSION = JSON.parse(readFileSync('package.json', 'utf8')).version;

async function icons() {
  mkdirSync(`${OUT}/icons`, { recursive: true });
  try {
    const { default: sharp } = await import('sharp');
    const svg = readFileSync('public/icon.svg');
    for (const [n, s] of [['icon-192', 192], ['icon-512', 512], ['apple-touch-icon', 180]]) await sharp(svg, { density: 384 }).resize(s, s).png().toFile(`${OUT}/icons/${n}.png`);
    // maskable: ikona z marginesem bezpieczeństwa
    await sharp(svg, { density: 384 }).resize(380, 380).extend({ top: 66, bottom: 66, left: 66, right: 66, background: '#0f172a' }).png().toFile(`${OUT}/icons/maskable-512.png`);
  } catch (e) { console.warn('Brak sharp — ikony PNG pominięte:', e.message); }
}

function walk(dir, base = dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p, base) : [p.slice(base.length + 1)];
  });
}

async function run() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const result = await build({
    entryPoints: { app: 'src/main.tsx' }, bundle: true, minify: !watch, sourcemap: watch ? 'inline' : false, format: 'esm', target: 'es2020',
    outdir: OUT, entryNames: '[name]-[hash]', assetNames: '[name]-[hash]', metafile: true, jsx: 'automatic',
    define: { 'process.env.NODE_ENV': watch ? '"development"' : '"production"' }, loader: { '.svg': 'dataurl' }, logLevel: 'warning',
  });
  const outs = Object.keys(result.metafile.outputs).map((p) => p.replace(`${OUT}/`, ''));
  const js = outs.find((f) => f.endsWith('.js'));
  const css = outs.find((f) => f.endsWith('.css'));
  let html = readFileSync('public/index.html', 'utf8').replace('__JS__', js).replace('__CSS__', css ?? '');
  writeFileSync(`${OUT}/index.html`, html);
  for (const f of ['manifest.webmanifest', 'icon.svg']) cpSync(`public/${f}`, `${OUT}/${f}`);
  await icons();

  const files = walk(OUT).filter((f) => f !== 'sw.js');
  const hash = createHash('sha1');
  for (const f of files) hash.update(readFileSync(join(OUT, f)));
  const cacheName = `formplus-${VERSION}-${hash.digest('hex').slice(0, 10)}`;
  const precache = ['./', ...files.filter((f) => f !== 'index.html').map((f) => `./${f}`), './index.html'];
  const sw = readFileSync('public/sw.template.js', 'utf8').replace('__CACHE__', cacheName).replace('__PRECACHE__', JSON.stringify(precache));
  writeFileSync(`${OUT}/sw.js`, sw);
  const kb = (f) => (statSync(join(OUT, f)).size / 1024).toFixed(0);
  console.log(`✔ build ${cacheName}: ${js} ${kb(js)} KB${css ? `, ${css} ${kb(css)} KB` : ''}, ${precache.length} plików w precache`);
}

if (watch) {
  await run();
  const ctx = await context({ entryPoints: ['src/main.tsx'], bundle: true, write: false });
  console.log('Tryb --watch: przebuduj ręcznie poleceniem `npm run build` po zmianach.'); await ctx.dispose();
} else await run();
