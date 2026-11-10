import { useEffect, useMemo, useRef, useState } from 'react';
import type { SessionRecord } from '../core/types';
import { addSession, nav, useStore } from '../core/store';
import { t } from '../core/i18n';
import { cue, keepAwake, speak, unlockAudio, vibrationSupported, wakeLockSupported } from '../core/audio';
import { buildSchedule, elapsedMs, idleRun, pauseRun, phaseAt, startRun, type Phase, type RunState, type TimerConfig, type TimerMode } from '../engine/timer';
import { EX_BY_ID } from '../data/exercises';
import { ROUTINE_BY_ID, routineMinutes, stepSeconds } from '../data/routines';
import { dateKey, fmtClock, uid } from '../core/time';
import { Card, Chip, Ring, Seg, Stepper, TopBar, useTick } from '../ui/components';
import { Figure } from '../ui/Figure';
import { IClock, IDone, IInfo, IPause, IPlay, IReset, ISkip } from '../ui/icons';
import { startRoutineWorkout } from '../ui/actions';

const MODES: { id: TimerMode; pl: string; sub: string }[] = [
  { id: 'stopwatch', pl: 'Stoper', sub: 'liczy w górę, okrążenia' },
  { id: 'countdown', pl: 'Odliczanie', sub: 'dowolny czas' },
  { id: 'rest', pl: 'Odpoczynek', sub: 'przerwa między seriami' },
  { id: 'tabata', pl: 'Tabata', sub: '20 s pracy / 10 s przerwy × 8' },
  { id: 'intervals', pl: 'Interwały', sub: 'własna praca / przerwa' },
  { id: 'emom', pl: 'EMOM', sub: 'co minutę na minutę' },
  { id: 'amrap', pl: 'AMRAP', sub: 'jak najwięcej rund w czasie' },
  { id: 'stretch', pl: 'Rozciąganie', sub: 'pozycje ze zmianą strony' },
];

const phaseLabel = (p: Phase) => t(p.label.replace(/ \d+$/, '')) + (/ \d+$/.test(p.label) ? p.label.match(/ \d+$/)![0] : '');

/** Uniwersalny, odporny na tło timer (czas liczony ze znaczników, nie z licznika ticków). */
export function TimerRunner({ mode, schedule, title, below, onFinish, onExit }: {
  mode: TimerMode; schedule: Phase[]; title: string; below?: (pos: ReturnType<typeof phaseAt>) => React.ReactNode;
  onFinish?: (elapsedSec: number) => void; onExit: () => void;
}) {
  const [run, setRun] = useState<RunState>(idleRun());
  const [laps, setLaps] = useState<number[]>([]);
  const [rounds, setRounds] = useState(0);
  const running = run.startedAt !== null;
  useTick(100, running);
  const now = Date.now();
  const el = elapsedMs(run, now);
  const pos = useMemo(() => phaseAt(schedule, el), [schedule, el]);
  const lastIdx = useRef(-1);
  const lastTick = useRef(-1);
  const fin = useRef(false);

  useEffect(() => { void keepAwake(running); return () => { void keepAwake(false); }; }, [running]);

  useEffect(() => {
    if (mode === 'stopwatch' || !running) return;
    if (pos.finished) {
      if (!fin.current) { fin.current = true; cue('done'); speak(t('Koniec')); setRun((r) => pauseRun(r, Date.now())); onFinish?.(pos.totalSec); }
      return;
    }
    if (pos.index !== lastIdx.current) {
      const first = lastIdx.current === -1;
      lastIdx.current = pos.index; lastTick.current = -1;
      const lateMs = pos.elapsedInPhase * 1000;
      if (lateMs < 1500 || first) { cue(pos.phase!.kind === 'rest' ? 'rest' : 'go'); speak(phaseLabel(pos.phase!)); }
    }
    if (pos.remaining <= 3 && pos.remaining > 0 && lastTick.current !== pos.remaining && pos.phase!.sec > 3) { lastTick.current = pos.remaining; cue('tick'); }
  });

  const start = () => { unlockAudio(); setRun((r) => startRun(r, Date.now())); };
  const pause = () => setRun((r) => pauseRun(r, Date.now()));
  const reset = () => { setRun(idleRun()); setLaps([]); setRounds(0); lastIdx.current = -1; fin.current = false; };
  const skip = () => {
    if (pos.finished || !pos.phase) return;
    const target = schedule.slice(0, pos.index + 1).reduce((s, p) => s + p.sec, 0) * 1000;
    setRun((r) => (r.startedAt !== null ? { ...r, startedAt: Date.now(), accumMs: target } : { ...r, accumMs: target }));
  };

  const big = mode === 'stopwatch' ? fmtClock(Math.floor(el / 1000)) : pos.finished ? '0:00' : fmtClock(pos.remaining);
  const kind = pos.phase?.kind;
  return (
    <div className="stack">
      <Card className={`stack center ${kind === 'work' ? 'accent' : ''}`}>
        <div className="small muted">{title}</div>
        {mode !== 'stopwatch' && (
          <div className="bold" style={{ fontSize: 22, color: kind === 'rest' ? 'var(--blue-l)' : 'var(--teal)' }} aria-live="polite">
            {pos.finished ? t('Gotowe!') : !run.accumMs && !running ? t('Gotowy?') : phaseLabel(pos.phase!)}
          </div>
        )}
        <div className="row" style={{ justifyContent: 'center' }}>
          {mode === 'stopwatch'
            ? <div className="bigtimer" role="timer">{big}</div>
            : <Ring value={pos.finished ? 1 : pos.total ? pos.elapsedInPhase / pos.total : 0} size={220} stroke={12}><div className="bigtimer" style={{ fontSize: 56 }} role="timer">{big}</div></Ring>}
        </div>
        {mode !== 'stopwatch' && !pos.finished && (
          <>
            {pos.phase?.round && <div className="small muted">{t('Runda {a} z {b}', { a: pos.phase.round, b: pos.phase.rounds ?? '?' })}</div>}
            {pos.phase?.next && <div className="small muted">{t('Następne')}: {phaseLabel({ ...pos.phase, label: pos.phase.next })}</div>}
            <div className="bar"><i style={{ width: `${(pos.elapsedSec / pos.totalSec) * 100}%` }} /></div>
            <div className="tiny faint num">{fmtClock(Math.floor(pos.elapsedSec))} / {fmtClock(pos.totalSec)}</div>
          </>
        )}
      </Card>

      {mode === 'amrap' && (
        <Card className="row between"><b>{t('Ukończone rundy')}</b><Stepper label={t('Ukończone rundy')} value={rounds} onChange={setRounds} max={999} /></Card>
      )}
      {below?.(pos)}

      <div className={mode === 'stopwatch' || mode === 'stretch' || mode === 'tabata' ? 'grid3' : 'grid2'}>
        {running
          ? <button className="btn primary big" onClick={pause}><IPause />{t('Pauza')}</button>
          : <button className="btn primary big" onClick={start} disabled={pos.finished && mode !== 'stopwatch'}><IPlay />{run.accumMs ? t('Wznów') : t('Start')}</button>}
        {mode === 'stopwatch'
          ? <button className="btn big" disabled={!running} onClick={() => setLaps((l) => [...l, el])}>{t('Okrążenie')}</button>
          : <button className="btn big" onClick={skip} disabled={pos.finished}><ISkip />{t('Pomiń')}</button>}
        <button className="btn big" onClick={reset}><IReset />{t('Reset')}</button>
      </div>
      {laps.length > 0 && <div className="stack sm">{[...laps].reverse().map((l, i) => <div key={i} className="row between small num card flat" style={{ padding: 10 }}><span>{t('Okrążenie')} {laps.length - i}</span><b>{fmtClock(Math.floor(l / 1000))}</b></div>)}</div>}
      <button className="btn ghost block" onClick={onExit}>{t('Zamknij timer')}</button>
    </div>
  );
}

export function TimersScreen() {
  const [mode, setMode] = useState<TimerMode | null>(null);
  const [cfg, setCfg] = useState({ seconds: 60, work: 40, rest: 20, rounds: 6, minutes: 10, per: 30, sides: true, positions: 4, started: false });
  const set = <K extends keyof typeof cfg>(k: K, v: (typeof cfg)[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const pick = (m: TimerMode) => {
    setMode(m);
    const d: Partial<typeof cfg> = m === 'tabata' ? { work: 20, rest: 10, rounds: 8 } : m === 'intervals' ? { work: 40, rest: 20, rounds: 6 } : m === 'emom' ? { minutes: 10, work: 40 } : m === 'amrap' ? { minutes: 10 }
      : m === 'rest' ? { seconds: 90 } : m === 'countdown' ? { seconds: 60 } : m === 'stretch' ? { per: 30, positions: 4 } : {};
    setCfg((c) => ({ ...c, ...d, started: m === 'stopwatch' }));
  };
  const config: TimerConfig | null = mode && {
    mode, seconds: mode === 'amrap' ? cfg.minutes * 60 : cfg.seconds, work: cfg.work, rest: cfg.rest, rounds: cfg.rounds, minutes: cfg.minutes,
    positions: Array.from({ length: cfg.positions }, (_, i) => ({ label: `${t('Pozycja')} ${i + 1}`, sec: cfg.per, perSide: cfg.sides })),
  };
  const schedule = useMemo(() => (config ? buildSchedule(config) : []), [mode, cfg]);
  const info = mode ? MODES.find((m) => m.id === mode)! : null;

  return (
    <div className="overlay">
      <TopBar title={info ? t(info.pl) : t('Timery')} onBack={mode ? () => setMode(null) : nav.pop} />
      <div className="main stack">
        {!mode && (<>
          <div className="grid2">{MODES.map((m) => (
            <button key={m.id} className="card btn" onClick={() => pick(m.id)} style={{ minHeight: 92 }}><div className="bold">{t(m.pl)}</div><div className="small muted">{t(m.sub)}</div></button>
          ))}</div>
          <Card className="stack sm"><div className="row"><IInfo style={{ width: 20, height: 20, color: 'var(--blue-l)' }} /><b>{t('Timery a tło / iPhone')}</b></div>
            <p className="small muted">{t('Czas liczony jest ze znaczników zegara, więc po powrocie do aplikacji pokazuje poprawną wartość. Dźwięk i głos działają, gdy ekran jest włączony — przeglądarki (zwłaszcza Safari na iOS) wstrzymują aplikację w tle i mogą ją zablokować. Dlatego aplikacja prosi o blokadę wygaszania ekranu podczas odliczania.')}</p>
            <p className="small muted">{vibrationSupported() ? t('Wibracje: dostępne na tym urządzeniu.') : t('Wibracje: niedostępne (np. iOS Safari) — użyj dźwięku.')} {wakeLockSupported() ? t('Blokada ekranu: dostępna.') : t('Blokada ekranu: niedostępna — ustaw dłuższe wygaszanie w systemie.')}</p>
          </Card>
        </>)}

        {mode && !cfg.started && mode !== 'stopwatch' && (
          <Card className="stack">
            {(mode === 'countdown' || mode === 'rest') && (<>
              <div className="chips">{[30, 45, 60, 90, 120, 180].map((s) => <Chip key={s} on={cfg.seconds === s} onClick={() => set('seconds', s)}>{s < 60 ? `${s} s` : `${s / 60 >> 0}:${String(s % 60).padStart(2, '0')}`}</Chip>)}</div>
              <Field label={t('Czas (s)')}><Stepper label={t('Czas (s)')} value={cfg.seconds} step={5} min={5} max={3600} onChange={(v) => set('seconds', v)} unit="s" /></Field>
            </>)}
            {(mode === 'tabata' || mode === 'intervals') && (<>
              <Field label={t('Praca (s)')}><Stepper label={t('Praca (s)')} value={cfg.work} step={5} min={5} max={300} onChange={(v) => set('work', v)} unit="s" /></Field>
              <Field label={t('Przerwa (s)')}><Stepper label={t('Przerwa (s)')} value={cfg.rest} step={5} min={0} max={300} onChange={(v) => set('rest', v)} unit="s" /></Field>
              <Field label={t('Rundy')}><Stepper label={t('Rundy')} value={cfg.rounds} min={1} max={50} onChange={(v) => set('rounds', v)} /></Field>
            </>)}
            {mode === 'emom' && (<>
              <Field label={t('Liczba minut')}><Stepper label={t('Liczba minut')} value={cfg.minutes} min={2} max={60} onChange={(v) => set('minutes', v)} unit="min" /></Field>
              <Field label={t('Praca w minucie (s)')}><Stepper label={t('Praca w minucie (s)')} value={cfg.work} step={5} min={10} max={55} onChange={(v) => set('work', v)} unit="s" /></Field>
            </>)}
            {mode === 'amrap' && <Field label={t('Czas (min)')}><Stepper label={t('Czas (min)')} value={cfg.minutes} min={1} max={60} onChange={(v) => set('minutes', v)} unit="min" /></Field>}
            {mode === 'stretch' && (<>
              <p className="small muted">{t('Czas utrzymania jednej pozycji. Rozciągaj do łagodnego napięcia, nigdy do bólu.')}</p>
              <div className="chips">{[20, 30, 45, 60].map((s) => <Chip key={s} on={cfg.per === s} onClick={() => set('per', s)}>{s} s</Chip>)}</div>
              <Field label={t('Liczba pozycji')}><Stepper label={t('Liczba pozycji')} value={cfg.positions} min={1} max={20} onChange={(v) => set('positions', v)} /></Field>
              <Seg value={cfg.sides ? 1 : 0} onChange={(v) => set('sides', v === 1)} options={[{ v: 1, label: t('Obie strony') }, { v: 0, label: t('Bez zmiany strony') }]} />
            </>)}
            <div className="small muted">{t('Łączny czas')}: {fmtClock(schedule.reduce((s, p) => s + p.sec, 0))}</div>
            <button className="btn primary big" onClick={() => { unlockAudio(); set('started', true); }}><IPlay />{t('Przejdź do timera')}</button>
          </Card>
        )}

        {mode && cfg.started && (
          <TimerRunner key={`${mode}`} mode={mode} schedule={schedule} title={t(info!.pl)} onExit={() => set('started', false)} />
        )}
      </div>
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <div className="field"><label>{label}</label><div>{children}</div></div>;

// ——— ekran programu rozciągania / mobilności: opis + prowadzona sesja ———
export function RoutineScreen({ id }: { id: string }) {
  const r = ROUTINE_BY_ID[id];
  const [guided, setGuided] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sw, setSw] = useState(5);
  const sessions = useStore((s) => s.sessions);
  void sessions;

  const plan = useMemo(() => {
    if (!r) return { positions: [] as { label: string; sec: number; perSide: boolean; exId: string }[], schedule: [] as Phase[], map: [] as (string | null)[] };
    const positions = r.steps.map((s) => ({ label: EX_BY_ID[s.exId].pl, sec: stepSeconds(s), perSide: !!EX_BY_ID[s.exId].scheme.perSide, exId: s.exId }));
    const schedule = buildSchedule({ mode: 'stretch', positions, switchSec: sw, prep: 5 });
    const map: (string | null)[] = [null];
    for (const p of positions) { map.push(p.exId); if (p.perSide) { map.push(p.exId); map.push(p.exId); } }
    return { positions, schedule, map };
  }, [r, sw]);

  if (!r) return <div className="overlay"><TopBar title="?" onBack={nav.pop} /></div>;

  const save = (elapsedSec: number) => {
    let acc = 5; const items: SessionRecord['items'] = [];
    for (const p of plan.positions) {
      const dur = p.perSide ? p.sec * 2 + sw : p.sec;
      if (elapsedSec + 1 >= acc + dur) items.push({ exId: p.exId, rest: 0, section: 'main', sets: Array.from({ length: p.perSide ? 2 : 1 }, () => ({ done: true, seconds: p.sec })) });
      acc += dur;
    }
    if (!items.length) return;
    const now = Date.now();
    void addSession({ id: uid('s'), date: dateKey(now), startedAt: now - elapsedSec * 1000, endedAt: now, durationSec: Math.round(elapsedSec), title: r.pl, kind: 'mobility', items });
    setSaved(true); nav.toast(t('Sesja zapisana w historii'));
  };

  return (
    <div className="overlay">
      <TopBar title={r.pl} onBack={nav.pop} />
      <div className="main stack">
        {!guided ? (<>
          <p className="muted">{r.desc}</p>
          <div className="small muted"><IClock style={{ width: 14, height: 14, verticalAlign: -2 }} /> {routineMinutes(r)} min · {r.steps.length} {t('pozycji')}</div>
          {r.group !== 'warmup' && <div className="card warn small">{t('Rozciągaj do łagodnego napięcia — nie do bólu. Oddychaj spokojnie, nie wykonuj sprężynowania. Przy ostrym bólu, drętwieniu lub mrowieniu przerwij.')}</div>}
          <div className="field"><label>{t('Przerwa na zmianę strony')}</label><Seg value={sw} onChange={setSw} options={[3, 5, 10].map((n) => ({ v: n, label: `${n} s` }))} /></div>
          <button className="btn primary big" onClick={() => { unlockAudio(); setGuided(true); }}><IPlay />{t('Rozpocznij prowadzoną sesję')}</button>
          <button className="btn block" onClick={() => startRoutineWorkout(r)}>{t('Wykonaj jako trening (z zapisem serii)')}</button>
          <div className="stack sm">{r.steps.map((s, i) => { const e = EX_BY_ID[s.exId]; return (
            <button key={i} className="list-item" onClick={() => nav.push({ name: 'exercise', id: e.id })}>
              <span className="num bold muted" style={{ width: 24 }}>{i + 1}</span>
              <span className="grow"><div className="bold">{e.pl}</div><div className="small muted">{stepSeconds(s)} s{e.scheme.perSide ? ` × 2 ${t('strony')}` : ''}</div></span>
            </button>); })}</div>
        </>) : (
          <TimerRunner mode="stretch" schedule={plan.schedule} title={r.pl} onExit={() => setGuided(false)} onFinish={save}
            below={(pos) => {
              const exId = pos.finished ? null : plan.map[pos.index];
              const ex = exId ? EX_BY_ID[exId] : plan.positions[0] && EX_BY_ID[plan.positions[0].exId];
              return (<div className="stack sm">
                {pos.finished ? <Card className="accent center stack"><IDone style={{ width: 40, height: 40, color: 'var(--teal)', margin: '0 auto' }} /><b>{t('Sesja ukończona!')}</b>{saved && <span className="small">{t('Zapisano w historii.')}</span>}</Card>
                  : ex && <><div className="bold">{ex.pl}</div><Figure animationId={ex.animationId} /><div className="small muted">{ex.cues[0]}</div><div className="small" style={{ color: 'var(--warn)' }}>{t('Bez bólu — łagodne napięcie.')}</div></>}
              </div>);
            }} />
        )}
      </div>
    </div>
  );
}
