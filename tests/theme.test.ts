import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const block = css.match(/:root\[data-theme="marble"\] \{([^}]*)\}/)![1];
const tok = (n: string) => block.match(new RegExp(`--${n}:\\s*(#[0-9a-fA-F]{6})`))![1];
const lin = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (h: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const cr = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const mix = (a: string, b: string, t: number) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');

test('motyw „Kulki”: kontrast tekstu ≥ 4.5:1 (WCAG AA) na tle strony i kartach', () => {
  const bgs = { top: tok('bg'), glow: mix(tok('bg'), '#ffffff', 0.08), bottom: '#0a2766', card: '#0f2a66', cardTop: '#14357a', card2: tok('card2'), bg2: tok('bg2') };
  for (const f of ['text', 'muted', 'faint', 'teal', 'warn', 'blue-l', 'danger', 'green']) {
    for (const [n, bg] of Object.entries(bgs)) assert.ok(cr(tok(f), bg) >= 4.5, `${f} na ${n}: ${cr(tok(f), bg).toFixed(2)}`);
  }
  // przyciski: biały na różowym, ciemny na żółto-pomarańczowym i turkusowym
  for (const pk of [tok('pink-a'), tok('pink-b')]) assert.ok(cr('#ffffff', pk) >= 4.5, `biały na ${pk}`);
  for (const sun of [tok('sun-a'), tok('sun-b')]) assert.ok(cr('#2b1200', sun) >= 4.5, `ciemny na ${sun}`);
  assert.ok(cr('#4a2000', tok('sun-b')) >= 4.5);
  for (const f of [tok('fill-a'), tok('fill-b')]) assert.ok(cr('#062a4d', f) >= 4.5, `ciemny na ${f}`);
});
