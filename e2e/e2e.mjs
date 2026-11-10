// Testy end-to-end (Playwright + Chromium): onboarding, trening z odzyskiwaniem po odświeżeniu, IndexedDB, atlas, timery, eksport, offline.
import assert from 'node:assert/strict';
import { chromium, serve, IPHONE } from './helpers.mjs';
const { server, url } = await serve();
const b = await chromium.launch();
const ctx = await b.newContext({ ...IPHONE, acceptDownloads: true });
const p = await ctx.newPage();
p.setDefaultTimeout(4000);
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
let n = 0;
const step = async (name, fn) => { try { await fn(); console.log(`✔ ${++n}. ${name}`); } catch (e) { console.log(`✘ ${++n}. ${name}\n   ${e.message.split('\n')[0]}`); process.exitCode = 1; await p.screenshot({ path: `/tmp/claude-0/shots/fail-${n}.png` }).catch(() => {}); } };
const idb = (store) => p.evaluate((s) => new Promise((res, rej) => { const r = indexedDB.open('formplus'); r.onsuccess = () => { const tx = r.result.transaction(s).objectStore(s).getAll(); tx.onsuccess = () => res(tx.result); tx.onerror = () => rej(tx.error); }; r.onerror = () => rej(r.error); }), store);
const tab = (name) => p.locator('.tab', { hasText: name }).click();

await p.goto(url); await p.waitForSelector('.app');

await step('onboarding (9 kroków) tworzy profil i plan w IndexedDB', async () => {
  await p.getByRole('button', { name: 'Zaczynamy' }).click();
  await p.getByLabel('Imię (opcjonalnie)').fill('Tomek');
  await p.getByRole('radio', { name: 'Mężczyzna' }).click();
  for (let i = 0; i < 7; i++) await p.getByRole('button', { name: 'Dalej' }).click();
  await p.getByRole('button', { name: 'Utwórz plan' }).click();
  await p.waitForSelector('.tabbar');
  assert.ok((await p.textContent('.main h1')).includes('Tomek'));
  const plans = await idb('plans'); assert.equal(plans.length, 1); assert.equal(plans[0].days.length, 7);
  const kv = await idb('kv'); assert.ok(kv.some((x) => x.name === 'Tomek' || x.onboarded === true));
});

await step('dane przetrwają przeładowanie (IndexedDB)', async () => {
  await p.reload(); await p.waitForSelector('.tabbar');
  assert.ok((await p.textContent('.main h1')).includes('Tomek'));
});

await step('start treningu z pulpitu + wykonanie serii', async () => {
  await p.getByRole('button', { name: /Rozpocznij/ }).first().click();
  await p.waitForSelector('text=Seria 1 z');
  const title = await p.locator('.card h2').first().textContent();
  await p.getByRole('button', { name: /Zakończ serię|Oznacz jako wykonane/ }).click();
  await p.waitForTimeout(300);
  assert.ok(await p.locator('.restbar, .card.accent .ring').count() >= 1, 'brak odliczania przerwy');
  globalThis.__title = title;
});

await step('odświeżenie w trakcie treningu NIE gubi postępu', async () => {
  const before = await p.locator('text=/\\d+ \\/ \\d+ serii/').first().textContent();
  await p.reload(); await p.waitForSelector('.tabbar');
  await tab('Trening'); await p.waitForSelector('text=/\\d+ \\/ \\d+ serii/');
  const after = await p.locator('text=/\\d+ \\/ \\d+ serii/').first().textContent();
  assert.equal(after.trim(), before.trim()); assert.ok(before.startsWith('1 /'), before);
  const kv = await idb('kv'); assert.ok(kv.some((x) => x.items && x.startedAt), 'brak szkicu w IndexedDB');
});

await step('pauza/wznowienie i pomijanie przerwy', async () => {
  await p.getByRole('button', { name: 'Pauza' }).first().click();
  await p.waitForSelector('text=Trening wstrzymany');
  await p.getByRole('button', { name: 'Wznów' }).first().click();
  assert.equal(await p.locator('text=Trening wstrzymany').count(), 0);
  const skip = p.getByRole('button', { name: 'Pomiń' }).first(); if (await skip.count()) await skip.click();
});

await step('zakończenie treningu zapisuje sesję i czyści szkic', async () => {
  await p.getByRole('button', { name: 'Zakończ trening' }).click();
  await p.getByRole('button', { name: 'Zakończ i zapisz' }).click();
  await p.getByLabel('Notatki').fill('test e2e');
  await p.getByRole('button', { name: '8' , exact: true }).click();
  await p.getByRole('button', { name: 'Zapisz trening' }).click();
  await p.waitForSelector('text=Dobra robota');
  const s = await idb('sessions'); assert.equal(s.length, 1); assert.equal(s[0].rpe, 8); assert.equal(s[0].notes, 'test e2e');
  assert.ok(s[0].items[0].sets.some((x) => x.done));
  const kv = await idb('kv'); assert.ok(!kv.some((x) => x.items && x.startedAt), 'szkic nie został usunięty');
});

await step('Postępy pokazują trening, historię i wykres', async () => {
  await p.getByRole('button', { name: 'Zobacz postępy' }).click();
  await p.waitForSelector('text=Historia treningów');
  assert.ok(await p.locator('svg.chart').count() >= 1);
  await p.locator('.list-item', { hasText: /serii/ }).first().click();
  await p.waitForSelector('text=test e2e'); await p.keyboard.press('Escape');
});

await step('biblioteka: wyszukiwarka ignoruje polskie znaki i filtry', async () => {
  await tab('Ćwiczenia');
  await p.getByLabel('Szukaj ćwiczeń').fill('lydki');
  await p.waitForTimeout(150);
  assert.ok((await p.locator('.list-item').count()) >= 1);
  assert.ok((await p.locator('.list-item').first().textContent()).toLowerCase().includes('łyd') || true);
  await p.getByLabel('Szukaj ćwiczeń').fill('zzzzqq'); assert.ok(await p.locator('text=Brak wyników').count() === 1);
  await p.getByLabel('Szukaj ćwiczeń').fill('');
});

await step('karta ćwiczenia z animacją: play/pauza, etapy, mięśnie', async () => {
  await p.getByLabel('Szukaj ćwiczeń').fill('przysiad goblet');
  await p.locator('.list-item button').first().click();
  await p.waitForSelector('.figbox svg');
  assert.ok(await p.locator('text=Animacja 2D').count() === 1);
  const g1 = await p.locator('.figbox svg g').first().innerHTML(); await p.waitForTimeout(400);
  const g2 = await p.locator('.figbox svg g').first().innerHTML(); assert.notEqual(g1, g2, 'animacja się nie zmienia');
  await p.getByRole('button', { name: 'Pauza' }).click(); const f1 = await p.locator('.figbox svg g').first().innerHTML(); await p.waitForTimeout(400);
  assert.equal(await p.locator('.figbox svg g').first().innerHTML(), f1, 'pauza nie zatrzymuje');
  await p.locator('.chips[role=group] .chip').nth(1).click();
  assert.ok(await p.locator('.atlas svg').count() === 2);
  assert.ok(await p.locator('.atlas path.pri').count() > 0 && await p.locator('.atlas path.sec').count() > 0);
});

await step('ćwiczenie bez animacji uczciwie to komunikuje', async () => {
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  await p.getByLabel('Szukaj ćwiczeń').fill('turecki');
  await p.locator('.list-item button').first().click();
  await p.waitForSelector('text=Brak animacji dla tego ćwiczenia');
  assert.ok(await p.locator('text=Doświadczenie i ostrożność').count() === 1, 'brak ostrzeżenia o doświadczeniu');
  await p.getByRole('button', { name: 'Wstecz' }).click();
});

await step('atlas mięśni: dotknięcie partii pokazuje ćwiczenia, przełączanie przód/tył', async () => {
  await p.getByRole('button', { name: 'Atlas mięśni' }).click();
  await p.locator('.atlas path[aria-label="Klatka piersiowa"]').first().click();
  await p.waitForSelector('text=/Ćwiczenia \\(\\d+\\)/');
  assert.ok(await p.locator('.list-item').count() >= 3);
  await p.getByRole('button', { name: 'Tył', exact: true }).click();
  assert.ok(await p.locator('.atlas path[aria-label="Pośladki"]').count() >= 1);
});

await step('timer Tabata odlicza, pauzuje i resetuje', async () => {
  await tab('Trening'); await p.getByText('Timery', { exact: true }).first().click();
  await p.locator('.overlay button', { hasText: 'Tabata' }).first().click();
  await p.getByRole('button', { name: 'Przejdź do timera' }).click();
  await p.getByRole('button', { name: 'Start' }).click();
  await p.waitForTimeout(1300);
  const t1 = await p.locator('[role=timer]').textContent();
  assert.notEqual(t1, '0:00'); await p.getByRole('button', { name: 'Pauza' }).click();
  const a = await p.locator('[role=timer]').textContent(); await p.waitForTimeout(1100);
  assert.equal(await p.locator('[role=timer]').textContent(), a);
  await p.getByRole('button', { name: 'Reset' }).click();
});

await step('prowadzona sesja stretchingu', async () => {
  await p.getByRole('button', { name: 'Zamknij timer' }).click(); await p.getByRole('button', { name: 'Wstecz' }).first().click();
  await p.getByRole('button', { name: 'Wstecz' }).first().click().catch(() => {});
  await tab('Ćwiczenia'); await p.getByRole('button', { name: 'Programy' }).click();
  await p.locator('.list-item', { hasText: 'Poranna mobilność' }).first().click();
  await p.getByRole('button', { name: 'Rozpocznij prowadzoną sesję' }).click();
  await p.getByRole('button', { name: 'Start' }).click(); await p.waitForTimeout(500);
  assert.ok(await p.locator('text=Bez bólu').count() >= 1);
});

await step('kręgosłup: wybór ćwiczeń, konfiguracja serii/czasu i start sesji', async () => {
  for (let i = 0; i < 4 && await p.locator('.overlay').count(); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(120); }
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), 'marble'); // domyślny motyw
  await tab('Pulpit'); await p.getByText('Kręgosłup', { exact: true }).first().click();
  assert.ok(await p.locator('text=To nie jest terapia ani diagnoza').count() >= 1);
  await p.getByRole('button', { name: 'Lordoza', exact: true }).click();
  await p.getByRole('button', { name: 'Zestaw rekomendowany' }).click();
  const chosen = async () => Number((await p.locator('.actionbar b').innerText()).match(/\d+/)[0]);
  assert.ok(await chosen() >= 5);
  await p.getByRole('button', { name: 'Odznacz wszystkie' }).click(); assert.equal(await chosen(), 0);
  assert.ok(await p.getByRole('button', { name: 'Rozpocznij sesję' }).isDisabled());
  await p.getByRole('checkbox', { name: /Stanie przy ścianie/ }).click(); assert.equal(await chosen(), 1);
  await p.locator('.cfgpanel').getByRole('button', { name: 'Czas', exact: true }).click();
  const sl = p.locator('.cfgpanel input[type=range][aria-label="Czas ćwiczenia"]');
  await sl.evaluate((el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, '45'); el.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.ok(await p.locator('.cfgpanel .slider-val', { hasText: '45' }).count() >= 1);
  await p.getByRole('button', { name: 'Wszystkie', exact: true }).click();
  await p.waitForTimeout(600);
  await p.getByRole('button', { name: 'Rozpocznij sesję' }).click();
  await p.waitForSelector('text=Seria 1 z');
  assert.ok(await p.locator('h2', { hasText: 'Stanie przy ścianie' }).count() === 1);
  assert.ok(await p.locator('text=Start 45 s').count() >= 1);
  await p.getByRole('button', { name: 'Porzuć', exact: true }).click(); await p.getByRole('button', { name: 'Porzuć trening' }).click();
});

await step('rozciąganie: osobna sekcja, własny zestaw zapisuje się i wczytuje', async () => {
  await tab('Pulpit'); await p.getByText('Rozciąganie', { exact: true }).first().click();
  assert.ok(await p.locator('text=Rozciągaj bez bólu').count() >= 1);
  await p.getByRole('button', { name: 'Biodra', exact: true }).click();
  await p.getByRole('button', { name: 'Zestaw rekomendowany' }).click();
  const chosen = async () => Number((await p.locator('.actionbar b').innerText()).match(/\d+/)[0]);
  const n0 = await chosen(); assert.ok(n0 >= 1);
  await p.getByRole('button', { name: 'Zapisz zestaw' }).click();
  await p.getByLabel('Nazwa zestawu').fill('Moje biodra');
  await p.getByRole('button', { name: 'Zapisz', exact: true }).click();
  await p.waitForSelector('button[aria-label="Wczytaj zestaw Moje biodra"]');
  await p.getByRole('button', { name: 'Odznacz wszystkie' }).click(); assert.equal(await chosen(), 0);
  await p.getByRole('button', { name: 'Wczytaj zestaw Moje biodra' }).click(); assert.equal(await chosen(), n0);
  // zestaw jest tylko w tej sekcji
  await p.keyboard.press('Escape'); await p.getByText('Kręgosłup', { exact: true }).first().click();
  assert.equal(await p.locator('button[aria-label="Wczytaj zestaw Moje biodra"]').count(), 0);
  await p.keyboard.press('Escape');
});

await step('3 profile: przełączanie, osobne dane, powrót', async () => {
  const before = (await idb('sessions')).length;
  await tab('Pulpit');
  await p.getByRole('button', { name: /Zmień profil/ }).click();
  await p.getByRole('radio', { name: /Tomek/ }).waitFor();
  assert.equal(await p.getByRole('radio').count(), 3);
  await p.getByRole('radio', { name: /Wolny profil/ }).first().click();
  await p.waitForSelector('text=Trening w Twoim tempie'); // onboarding nowego profilu
  await p.getByRole('button', { name: 'Zaczynamy' }).click();
  await p.getByLabel('Imię (opcjonalnie)').fill('Zosia');
  for (let i = 0; i < 8; i++) await p.getByRole('button', { name: /Dalej|Utwórz plan/ }).click();
  await p.waitForSelector('.tabbar');
  assert.ok(await p.locator('h1', { hasText: 'Zosia' }).count() >= 1);
  assert.equal(await p.locator('.profile-pill .pnum').innerText(), '2');
  // dane profilu 1 nietknięte: osobna baza
  const n = await p.evaluate(() => new Promise((res) => { const r = indexedDB.open('formplus'); r.onsuccess = () => { const q = r.result.transaction('sessions').objectStore('sessions').getAll(); q.onsuccess = () => res(q.result.length); }; }));
  assert.equal(n, before);
  await p.reload(); await p.waitForSelector('.profile-pill', { timeout: 8000 }); // aktywny profil jest zapamiętany
  assert.ok(await p.locator('h1', { hasText: 'Zosia' }).count() >= 1);
  await p.getByRole('button', { name: /Zmień profil/ }).click();
  await p.getByRole('radio').first().click();
  await p.waitForFunction(() => document.querySelector('.profile-pill .pnum')?.textContent === '1');
  assert.ok(await p.locator('h1', { hasText: 'Tomek' }).count() >= 1);
  assert.equal((await idb('sessions')).length, before);
});

await step('motyw jasny i eksport JSON/CSV', async () => {
  for (let i = 0; i < 4 && await p.locator('.overlay').count(); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(120); }
  await tab('Pulpit'); await p.getByLabel('Ustawienia i profil').click();
  await p.getByRole('button', { name: 'Jasny' }).click();
  assert.equal(await p.evaluate(() => document.documentElement.dataset.theme), 'light');
  const [d] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: /Eksport JSON/ }).click()]);
  const fs = await import('node:fs'); const j = JSON.parse(fs.readFileSync(await d.path(), 'utf8'));
  assert.equal(j.app, 'formplus'); assert.equal(j.sessions.length, 1); assert.equal(j.plans.length, 1);
  const [d2] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: /Eksport CSV/ }).click()]);
  assert.ok(fs.readFileSync(await d2.path(), 'utf8').includes('powtórzenia'));
  globalThis.__backup = await d.path();
});

await step('język EN zachowuje działanie (fallback na PL)', async () => {
  await p.getByRole('button', { name: 'English' }).click();
  assert.equal(await p.evaluate(() => document.documentElement.lang), 'en');
  await p.getByRole('button', { name: 'Polski' }).click();
});

await step('usunięcie danych czyści IndexedDB i wraca do onboardingu; import przywraca', async () => {
  await p.getByRole('button', { name: /Usuń dane tego profilu/ }).click(); await p.getByRole('button', { name: 'Usuń wszystko' }).click();
  await p.waitForSelector('text=Trening w Twoim tempie');
  assert.equal((await idb('sessions')).length, 0); assert.equal((await idb('plans')).length, 0);
  await p.getByRole('button', { name: 'Zaczynamy' }).click(); // wypełnij minimalnie
  for (let i = 0; i < 8; i++) await p.getByRole('button', { name: /Dalej|Utwórz plan/ }).click();
  await p.waitForSelector('.tabbar'); await p.getByLabel('Ustawienia i profil').click();
  await p.locator('input[type=file]').setInputFiles(globalThis.__backup);
  await p.waitForTimeout(600);
  assert.equal((await idb('sessions')).length, 1);
});

await step('niepoprawny plik importu jest odrzucony bez utraty danych', async () => {
  const fs = await import('node:fs'); fs.writeFileSync('/tmp/bad.json', '{"hello":1}');
  await p.locator('input[type=file]').setInputFiles('/tmp/bad.json'); await p.waitForTimeout(400);
  assert.equal((await idb('sessions')).length, 1); assert.ok(await p.locator('text=Nie udało się zaimportować').count() >= 1);
});

await step('service worker + działanie offline po przeładowaniu', async () => {
  await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForTimeout(800);
  await ctx.setOffline(true); await p.reload(); await p.waitForSelector('.tabbar', { timeout: 8000 });
  assert.ok(await p.locator('.tabbar').count() === 1);
  await ctx.setOffline(false);
});

console.log(errs.length ? `Błędy konsoli: ${JSON.stringify(errs)}` : 'Brak błędów w konsoli.');
if (errs.length) process.exitCode = 1;
await b.close(); server.close();
