import { chromium, serve, IPHONE } from './helpers.mjs';
const OUT = process.argv[2] ?? '/tmp/claude-0/shots';
const { server, url } = await serve();
const b = await chromium.launch();
const ctx = await b.newContext({ ...IPHONE, serviceWorkers: 'block' });
const p = await ctx.newPage();
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
await p.goto(url);
await p.waitForSelector('.app');
await p.screenshot({ path: `${OUT}/01-welcome.png` });
for (let i = 0; i < 8; i++) { await p.getByRole('button', { name: /Dalej|Zaczynamy/ }).click(); if (i === 2) await p.screenshot({ path: `${OUT}/02-level.png` }); }
await p.screenshot({ path: `${OUT}/03-last-step.png` });
await p.getByRole('button', { name: 'Utwórz plan' }).click();
await p.waitForSelector('.tabbar');
await p.screenshot({ path: `${OUT}/04-dashboard.png` });
for (const [name, file] of [['Mój plan', '05-plan'], ['Ćwiczenia', '06-library'], ['Trening', '07-workout'], ['Postępy', '08-progress']]) {
  await p.locator('.tab', { hasText: name }).click(); await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/${file}.png` });
}
console.log('errors:', errs);
await b.close(); server.close();
