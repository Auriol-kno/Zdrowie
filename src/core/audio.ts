// Dźwięk, wibracje, mowa i blokada wygaszania ekranu.
// Ograniczenia PWA na iOS: audio wymaga gestu użytkownika, a timery w tle są wstrzymywane przez system —
// dlatego timery liczą czas z zegara (Date.now) i "doganiają" po powrocie, a dźwięk jest zapowiadany tylko przy aktywnym ekranie.
import { getState } from './store';

let ctx: AudioContext | null = null;
let wakeLock: { release: () => Promise<void> } | null = null;

export function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { /* brak audio */ }
}

function tone(freq: number, ms: number, when = 0, gain = 0.18) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  const t0 = ctx.currentTime + when;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
  o.connect(g).connect(ctx.destination);
  o.start(t0); o.stop(t0 + ms / 1000 + 0.02);
}

export type Cue = 'tick' | 'go' | 'rest' | 'done';

export function cue(kind: Cue) {
  const s = getState().settings;
  if (s.sound) {
    if (kind === 'tick') tone(660, 90);
    if (kind === 'go') { tone(880, 140); tone(1320, 200, 0.16); }
    if (kind === 'rest') { tone(520, 160); tone(400, 220, 0.18); }
    if (kind === 'done') { tone(660, 150); tone(880, 150, 0.17); tone(1175, 280, 0.34); }
  }
  if (s.vibrate && 'vibrate' in navigator) {
    try { navigator.vibrate(kind === 'tick' ? 30 : kind === 'done' ? [120, 80, 120, 80, 220] : [90, 60, 90]); } catch { /* iOS: brak */ }
  }
}

export function speak(text: string) {
  const s = getState().settings;
  if (!s.voice || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = s.lang === 'en' ? 'en-US' : 'pl-PL';
    window.speechSynthesis.speak(u);
  } catch { /* brak mowy */ }
}

export async function keepAwake(on: boolean) {
  try {
    const nav = navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    if (on && nav.wakeLock && !wakeLock) wakeLock = await nav.wakeLock.request('screen');
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { wakeLock = null; }
}

export const wakeLockSupported = () => 'wakeLock' in navigator;
export const vibrationSupported = () => 'vibrate' in navigator;
