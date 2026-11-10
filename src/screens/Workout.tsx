import { useEffect, useMemo, useRef, useState } from 'react';
import type { PlanDay, SessionRecord, WorkoutDraft } from '../core/types';
import { activePlan, addSession, getState, nav, setDraft, useStore } from '../core/store';
import { t } from '../core/i18n';
import { cue, keepAwake, speak, unlockAudio } from '../core/audio';
import { dayMinutes } from '../engine/generator';
import { activeMs, addRest, addSet, completeSet, doneSets, draftFromDay, editSet, finishDraft, isFinished, nextCursor, restRemainingSec, skipExercise, skipRest, togglePause } from '../engine/workout';
import { lastPerformance, newRecords, sessionSets, sessionVolume } from '../engine/stats';
import { suggestNext } from '../engine/progression';
import { EX_BY_ID } from '../data/exercises';
import { DAY_NAMES_PL, MUSCLES } from '../data/muscles';
import { ROUTINES, routineMinutes } from '../data/routines';
import { fmtClock } from '../core/time';
import { Card, Chip, Confirm, Empty, Ring, Section, Sheet, Stepper, TopBar, useTick } from '../ui/components';
import { Figure } from '../ui/Figure';
import { ICheck, IClock, IDone, IPause, IPlay, IPlus, IRight, ISkip, ITimer, ITrophy, IInfo } from '../ui/icons';
import { shortVersion, startRoutineWorkout } from '../ui/actions';
import { weekdayIndex, dateKey } from '../core/time';

export function WorkoutScreen() {
  const draft = useStore((s) => s.draft);
  const [summary, setSummary] = useState<{ s: SessionRecord; prs: { exId: string; weight: number; reps: number }[] } | null>(null);
  if (summary) return <Summary data={summary} onClose={() => setSummary(null)} />;
  if (draft) return <Active draft={draft} onFinished={setSummary} />;
  return <Picker />;
}

// ——— wybór treningu ———
function Picker() {
  const plan = useStore((s) => activePlan(s));
  const sessions = useStore((s) => s.sessions);
  const today = weekdayIndex(new Date());
  const day = plan?.days[today];
  const startDay = (d: PlanDay, idx: number) => { unlockAudio(); void setDraft(draftFromDay(d, plan?.id, idx)); };
  const doneToday = sessions.some((s) => s.date === dateKey());
  return (
    <>
      <TopBar title={t('Trening')} />
      <div className="main stack">
        {plan && day && day.kind !== 'rest' ? (
          <Card className="accent stack">
            <div className="row between"><span className="tag teal">{t('Na dziś')} · {t(DAY_NAMES_PL[today])}</span>{doneToday && <span className="tag"><IDone style={{ width: 14, height: 14 }} />&nbsp;{t('Dziś już trenowano')}</span>}</div>
            <h2>{day.title}</h2>
            <p className="small">{day.items.length} {t('ćwiczeń')} · ok. {dayMinutes(day)} min</p>
            <button className="btn primary big" onClick={() => startDay(day, today)}><IPlay />{t('Rozpocznij trening')}</button>
            {dayMinutes(day) > 25 && <button className="btn block" onClick={() => { unlockAudio(); void setDraft(shortVersion(day, 20, plan.id, today)); }}>{t('Krótsza wersja (ok. 20 min)')}</button>}
          </Card>
        ) : (
          <Empty icon={<IClock style={{ width: 40, height: 40 }} />} title={plan ? t('Dziś dzień odpoczynku') : t('Brak aktywnego planu')} text={t('Możesz zrobić lekką mobilność lub dowolny własny trening.')} />
        )}

        {plan && (
          <Section title={t('Inne dni planu')}>
            <div className="stack sm">
              {plan.days.map((d, i) => d.kind !== 'rest' && i !== today && (
                <button key={i} className="list-item" onClick={() => startDay(d, i)}>
                  <span className="grow"><div className="bold">{d.title}</div><div className="small muted">{t(DAY_NAMES_PL[i])} · {d.items.length} {t('ćwiczeń')} · ok. {dayMinutes(d)} min</div></span><IPlay style={{ color: 'var(--teal)' }} />
                </button>
              ))}
            </div>
          </Section>
        )}

        <Section title={t('Szybki start')}>
          <div className="stack sm">
            <button className="list-item" onClick={() => nav.push({ name: 'timers' })}><span className="thumb"><ITimer style={{ width: 24, height: 24 }} /></span><span className="grow"><div className="bold">{t('Timery')}</div><div className="small muted">{t('Stoper, Tabata, EMOM, AMRAP, interwały, rozciąganie')}</div></span><IRight style={{ color: 'var(--faint)' }} /></button>
            <button className="list-item" onClick={() => nav.tab('library')}><span className="thumb"><IPlus style={{ width: 24, height: 24 }} /></span><span className="grow"><div className="bold">{t('Własny trening')}</div><div className="small muted">{t('Wybierz ćwiczenia z biblioteki (przycisk +)')}</div></span><IRight style={{ color: 'var(--faint)' }} /></button>
            {ROUTINES.filter((r) => r.group !== 'themed').slice(0, 4).map((r) => (
              <button key={r.id} className="list-item" onClick={() => startRoutineWorkout(r)}><span className="thumb"><IClock style={{ width: 24, height: 24 }} /></span><span className="grow"><div className="bold">{r.pl}</div><div className="small muted">{routineMinutes(r)} min</div></span><IPlay style={{ color: 'var(--teal)' }} /></button>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}

// ——— aktywny trening ———
function Active({ draft: d, onFinished }: { draft: WorkoutDraft; onFinished: (x: { s: SessionRecord; prs: { exId: string; weight: number; reps: number }[] }) => void }) {
  const sessions = useStore((s) => s.sessions);
  const settings = useStore((s) => s.settings);
  const paused = d.pausedAt !== null;
  useTick(250, true);
  const [confirm, setConfirm] = useState<null | 'finish' | 'discard'>(null);
  const [form, setForm] = useState(false);
  const [list, setList] = useState(false);
  const [tech, setTech] = useState(false);
  const [timed, setTimed] = useState<number | null>(null);
  const restFired = useRef<number | null>(null);
  const update = (n: WorkoutDraft) => void setDraft(n);

  useEffect(() => { void keepAwake(!paused); return () => { void keepAwake(false); }; }, [paused]);

  const rest = restRemainingSec(d);
  useEffect(() => {
    if (d.restEndsAt === null || paused) return;
    if (rest <= 3 && rest > 0 && restFired.current !== -d.restEndsAt) { restFired.current = -d.restEndsAt; cue('tick'); }
    if (rest === 0 && restFired.current !== d.restEndsAt) {
      restFired.current = d.restEndsAt;
      const lateMs = Date.now() - d.restEndsAt;
      if (lateMs < 4000) { cue('go'); speak(t('Przerwa zakończona')); }
      update({ ...d, restEndsAt: null, restTotal: 0 });
    }
  });

  const cur = d.items[d.itemIdx];
  const ex = cur ? EX_BY_ID[cur.exId] : undefined;
  const finished = isFinished(d);
  const last = useMemo(() => (ex ? lastPerformance(sessions, ex.id) : null), [sessions, ex]);
  const sug = useMemo(() => (ex?.weighted ? suggestNext(ex, sessions) : null), [ex, sessions]);
  const upcoming = useMemo(() => {
    const n = nextCursor(d, { itemIdx: d.itemIdx, setIdx: d.setIdx });
    return n && n.itemIdx !== d.itemIdx ? EX_BY_ID[d.items[n.itemIdx].exId] : null;
  }, [d]);

  const complete = () => {
    if (!cur || !ex) return;
    const s = cur.sets[d.setIdx];
    const w = s.weight ?? (ex.weighted ? sug?.weight ?? undefined : undefined);
    const secs = s.targetSeconds ? (s.seconds ?? s.targetSeconds) : undefined;
    let nd = completeSet(d, { reps: s.reps ?? s.targetReps, weight: w, seconds: secs }, { autoRest: settings.autoRest });
    // przenieś ciężar na kolejną serię tego samego ćwiczenia
    if (w !== undefined && nd.itemIdx === d.itemIdx) {
      const nx = nd.items[nd.itemIdx].sets[nd.setIdx];
      if (nx && nx.weight === undefined) nd = editSet(nd, nd.itemIdx, nd.setIdx, { weight: w });
    }
    setTimed(null);
    cue(isFinished(nd) ? 'done' : 'tick');
    update(nd);
  };

  const startTimed = () => { unlockAudio(); cue('go'); setTimed(Date.now()); };
  const timedLeft = timed !== null && cur ? Math.max(0, (cur.sets[d.setIdx].targetSeconds ?? 0) - Math.floor((Date.now() - timed) / 1000)) : 0;
  useEffect(() => {
    if (timed !== null && timedLeft === 0) { cue('done'); complete(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const save = (extra: { rpe?: number; mood?: number; notes?: string; distanceM?: number }) => {
    const rec = finishDraft(d, extra);
    const prs = newRecords(getState().sessions, rec);
    rec.prs = prs;
    void addSession(rec);
    void setDraft(null);
    onFinished({ s: rec, prs });
  };

  const jump = (i: number) => {
    const it = d.items[i];
    const k = it.sets.findIndex((s) => !s.done);
    update({ ...d, items: d.items.map((x, j) => (j === i ? { ...x, skipped: false } : x)), itemIdx: i, setIdx: k < 0 ? 0 : k, restEndsAt: null, restTotal: 0 });
    setList(false); setTimed(null);
  };

  const elapsed = activeMs(d);
  const total = d.items.reduce((n, it) => n + it.sets.length, 0);

  return (
    <>
      <TopBar title={d.title} right={<button className="iconbtn fill" onClick={() => update(togglePause(d))} aria-label={paused ? t('Wznów') : t('Pauza')}>{paused ? <IPlay /> : <IPause />}</button>} />
      <div className="main stack">
        <div className="row between small muted">
          <span className="num"><IClock style={{ width: 14, height: 14, verticalAlign: -2 }} /> {fmtClock(Math.floor(elapsed / 1000))}</span>
          <span className="num">{doneSets(d)} / {total} {t('serii')}</span>
          <button className="chip" style={{ minHeight: 32 }} onClick={() => setList(true)}>{t('Lista ćwiczeń')}</button>
        </div>
        <div className="bar"><i style={{ width: `${total ? (doneSets(d) / total) * 100 : 0}%` }} /></div>

        {paused && <Card className="warn center stack"><b>{t('Trening wstrzymany')}</b><button className="btn primary" onClick={() => update(togglePause(d))}><IPlay />{t('Wznów')}</button></Card>}

        {d.restEndsAt !== null && !paused && (
          <Card className="accent stack center" >
            <div className="row" style={{ justifyContent: 'center', gap: 20 }}>
              <Ring value={d.restTotal ? rest / d.restTotal : 0} size={120}><div className="bold num" style={{ fontSize: 34 }}>{rest}</div><div className="tiny muted">{t('przerwa')}</div></Ring>
            </div>
            {upcoming && <div className="small">{t('Następne')}: <b>{upcoming.pl}</b></div>}
            <div className="grid3">
              <button className="btn sm" onClick={() => update(addRest(d, -15))} disabled={rest <= 15}>−15 s</button>
              <button className="btn sm" onClick={() => update(addRest(d, 15))}>+15 s</button>
              <button className="btn sm primary" onClick={() => update(skipRest(d))}><ISkip />{t('Pomiń')}</button>
            </div>
          </Card>
        )}

        {finished ? (
          <Card className="accent stack center">
            <IDone style={{ width: 48, height: 48, color: 'var(--teal)', margin: '0 auto' }} />
            <h2>{t('Wszystkie serie wykonane!')}</h2>
            <button className="btn primary big" onClick={() => setForm(true)}>{t('Zakończ i zapisz trening')}</button>
            <button className="btn block" onClick={() => setList(true)}>{t('Wróć do ćwiczeń')}</button>
          </Card>
        ) : cur && ex ? (
          <>
            <Card className="stack">
              <div className="row between"><span className="tag teal">{cur.section === 'warmup' ? t('Rozgrzewka') : cur.section === 'cooldown' ? t('Schłodzenie') : t('Ćwiczenie {a}/{b}', { a: d.itemIdx + 1, b: d.items.length })}</span>
                <button className="chip" style={{ minHeight: 32 }} onClick={() => nav.push({ name: 'exercise', id: ex.id })}><IInfo style={{ width: 14, height: 14 }} />{t('Szczegóły')}</button></div>
              <h2>{ex.pl}</h2>
              <div className="small muted">{ex.primary.map((m) => t(MUSCLES[m].pl)).join(', ')}</div>
              {last && <div className="small"><b>{t('Poprzednio')}</b> ({last.date}): {last.sets.map((s) => s.seconds ? `${s.seconds}s` : `${s.weight ? `${s.weight}kg×` : ''}${s.reps ?? '?'}`).join(' · ')}</div>}
              {sug && sug.weight !== null && <div className="small muted">{t('Propozycja')}: {sug.weight} kg × {sug.reps}</div>}
              <button className="chip" style={{ alignSelf: 'flex-start' }} onClick={() => setTech((v) => !v)} aria-pressed={tech}>{tech ? t('Ukryj technikę') : t('Pokaż technikę')}</button>
              {tech && <Figure animationId={ex.animationId} />}
              {ex.module === 'mobility' && <div className="small muted">{t('Rozciągaj do łagodnego napięcia — bez bólu.')}</div>}
              {ex.contra && <div className="small" style={{ color: 'var(--warn)' }}>{ex.contra}</div>}
            </Card>

            <CurrentSet d={d} update={update} ex={ex} sug={sug?.weight ?? null} timed={timed} timedLeft={timedLeft} startTimed={startTimed} stopTimed={() => setTimed(null)} complete={complete} />

            <div className="stack sm">
              {cur.sets.map((s, i) => i !== d.setIdx && (
                <div key={i} className={`setrow ${s.done ? 'done' : ''}`}>
                  <span className="n">{i + 1}</span>
                  {s.targetSeconds !== undefined
                    ? <div className="cell"><input inputMode="numeric" aria-label={`${t('Serie')} ${i + 1}: ${t('sekundy')}`} value={s.seconds ?? s.targetSeconds ?? ''} onChange={(e) => update(editSet(d, d.itemIdx, i, { seconds: num(e.target.value) }))} /><span className="tiny muted">s</span></div>
                    : <div className="cell"><input inputMode="numeric" aria-label={`${t('Serie')} ${i + 1}: ${t('powtórzenia')}`} value={s.reps ?? s.targetReps ?? ''} onChange={(e) => update(editSet(d, d.itemIdx, i, { reps: num(e.target.value) }))} /><span className="tiny muted">×</span></div>}
                  {ex.weighted
                    ? <div className="cell"><input inputMode="decimal" aria-label={`${t('Serie')} ${i + 1}: ${t('ciężar')}`} value={s.weight ?? ''} placeholder={sug?.weight?.toString() ?? '—'} onChange={(e) => update(editSet(d, d.itemIdx, i, { weight: num(e.target.value) }))} /><span className="tiny muted">kg</span></div>
                    : <span />}
                  <button className={`ok ${s.done ? 'on' : ''}`} aria-label={s.done ? t('Cofnij serię {n}', { n: i + 1 }) : t('Zaznacz serię {n}', { n: i + 1 })}
                    onClick={() => update(editSet(d, d.itemIdx, i, { done: !s.done, reps: s.reps ?? s.targetReps, seconds: s.seconds ?? s.targetSeconds }))}><ICheck /></button>
                </div>
              ))}
            </div>
            <div className="grid2">
              <button className="btn sm" onClick={() => update(addSet(d, d.itemIdx))}><IPlus />{t('Dodaj serię')}</button>
              <button className="btn sm" onClick={() => { setTimed(null); update(skipExercise(d)); }}><ISkip />{t('Pomiń ćwiczenie')}</button>
            </div>
          </>
        ) : null}

        <div className="grid2" style={{ marginTop: 8 }}>
          <button className="btn" onClick={() => setConfirm('finish')}>{t('Zakończ trening')}</button>
          <button className="btn danger" onClick={() => setConfirm('discard')}>{t('Porzuć')}</button>
        </div>
        <p className="tiny faint">{t('Trening zapisuje się automatycznie — odświeżenie strony go nie usuwa. Przy bólu przerwij ćwiczenie.')}</p>
      </div>

      {list && (
        <Sheet title={t('Ćwiczenia w treningu')} onClose={() => setList(false)}>
          <div className="stack sm">{d.items.map((it, i) => {
            const e = EX_BY_ID[it.exId]; const dn = it.sets.filter((s) => s.done).length;
            return (<button key={i} className="list-item" onClick={() => jump(i)} aria-current={i === d.itemIdx}>
              <span className="grow"><div className="bold">{e?.pl}</div><div className="small muted">{dn}/{it.sets.length} {t('serii')}{it.skipped ? ` · ${t('pominięte')}` : ''}</div></span>{dn === it.sets.length ? <IDone style={{ color: 'var(--green)' }} /> : <IRight style={{ color: 'var(--faint)' }} />}
            </button>);
          })}</div>
        </Sheet>
      )}
      {confirm === 'finish' && <Confirm title={t('Zakończyć trening?')} text={t('Wykonano {a} z {b} serii. Zapiszemy tylko wykonane serie.', { a: doneSets(d), b: total })} confirmLabel={t('Zakończ i zapisz')} onNo={() => setConfirm(null)} onYes={() => { setConfirm(null); if (doneSets(d) === 0) { nav.toast(t('Brak wykonanych serii — nie ma czego zapisać.')); return; } setForm(true); }} />}
      {confirm === 'discard' && <Confirm danger title={t('Porzucić trening?')} text={t('Trening nie zostanie zapisany w historii.')} confirmLabel={t('Porzuć trening')} onNo={() => setConfirm(null)} onYes={() => { setConfirm(null); setTimed(null); void setDraft(null); }} />}
      {form && <FinishForm onClose={() => setForm(false)} onSave={(x) => { setForm(false); save(x); }} carry={d.items.some((i) => EX_BY_ID[i.exId]?.kind === 'carry')} />}
    </>
  );
}

const num = (s: string): number | undefined => { const n = parseFloat(s.replace(',', '.')); return Number.isNaN(n) ? undefined : n; };

function CurrentSet({ d, update, ex, sug, timed, timedLeft, startTimed, stopTimed, complete }: {
  d: WorkoutDraft; update: (d: WorkoutDraft) => void; ex: (typeof EX_BY_ID)[string]; sug: number | null;
  timed: number | null; timedLeft: number; startTimed: () => void; stopTimed: () => void; complete: () => void;
}) {
  const it = d.items[d.itemIdx]; const s = it.sets[d.setIdx];
  const isTime = s.targetSeconds !== undefined;
  return (
    <Card className="stack" >
      <div className="row between"><h3>{t('Seria {a} z {b}', { a: d.setIdx + 1, b: it.sets.length })}</h3>{(it.perSide ?? ex.scheme.perSide) && <span className="tag blue">{t('na każdą stronę')}</span>}</div>
      {!isTime && !!it.hold && <div className="card flat" role="note"><b>{t('Utrzymaj każde powtórzenie {n} s', { n: it.hold })}</b></div>}
      {isTime ? (
        <>
          {timed !== null ? <div className="bigtimer" aria-live="polite">{timedLeft}<span className="small muted"> s</span></div>
            : <div className="row" style={{ justifyContent: 'center' }}><Stepper label={t('Sekundy')} value={s.seconds ?? s.targetSeconds ?? 0} step={5} min={5} max={900} unit="s" onChange={(v) => update(editSet(d, d.itemIdx, d.setIdx, { seconds: v, targetSeconds: v }))} /></div>}
          {timed === null
            ? <button className="btn primary big" onClick={startTimed}><IPlay />{t('Start')} {s.targetSeconds} s</button>
            : <button className="btn big" onClick={stopTimed}>{t('Przerwij odliczanie')}</button>}
          <button className="btn block" onClick={complete}><ICheck />{t('Oznacz jako wykonane')}</button>
        </>
      ) : (
        <>
          <div className="field"><label>{t('Powtórzenia')}</label><div className="row" style={{ justifyContent: 'center' }}><Stepper label={t('Powtórzenia')} value={s.reps ?? s.targetReps ?? 0} min={0} max={200} onChange={(v) => update(editSet(d, d.itemIdx, d.setIdx, { reps: v }))} /></div></div>
          {ex.weighted && <div className="field"><label>{t('Ciężar')}</label><div className="row" style={{ justifyContent: 'center' }}><Stepper label={t('Ciężar')} value={s.weight ?? sug ?? 0} step={ex.equipment.includes('barbell') ? 2.5 : 1} min={0} max={500} decimals={1} unit="kg" onChange={(v) => update(editSet(d, d.itemIdx, d.setIdx, { weight: v }))} /></div></div>}
          <button className="btn primary big" onClick={complete}><ICheck />{t('Zakończ serię')}</button>
        </>
      )}
    </Card>
  );
}

function FinishForm({ onClose, onSave, carry }: { onClose: () => void; onSave: (x: { rpe?: number; mood?: number; notes?: string; distanceM?: number }) => void; carry: boolean }) {
  const [rpe, setRpe] = useState<number | undefined>();
  const [mood, setMood] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [dist, setDist] = useState('');
  return (
    <Sheet title={t('Jak poszło?')} onClose={onClose}>
      <div className="stack">
        <div className="field"><label>{t('Wysiłek (RPE 1–10)')}</label><div className="chips wrap">{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <Chip key={n} on={rpe === n} onClick={() => setRpe(n)}>{n}</Chip>)}</div></div>
        <div className="field"><label>{t('Samopoczucie')}</label><div className="chips">{[[1, '😣'], [2, '😕'], [3, '😐'], [4, '🙂'], [5, '😄']].map(([n, e]) => <Chip key={n as number} on={mood === n} onClick={() => setMood(n as number)}>{e as string}</Chip>)}</div></div>
        {carry && <div className="field"><label htmlFor="dist">{t('Dystans (m) — opcjonalnie')}</label><input id="dist" className="input" inputMode="numeric" value={dist} onChange={(e) => setDist(e.target.value)} /></div>}
        <div className="field"><label htmlFor="nt">{t('Notatki')}</label><textarea id="nt" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <button className="btn primary big" onClick={() => onSave({ rpe, mood, notes: notes.trim() || undefined, distanceM: num(dist) })}>{t('Zapisz trening')}</button>
      </div>
    </Sheet>
  );
}

function Summary({ data, onClose }: { data: { s: SessionRecord; prs: { exId: string; weight: number; reps: number }[] }; onClose: () => void }) {
  const { s, prs } = data;
  const vol = sessionVolume(s);
  return (
    <>
      <TopBar title={t('Podsumowanie')} />
      <div className="main stack">
        <Card className="accent center stack"><IDone style={{ width: 52, height: 52, color: 'var(--teal)', margin: '0 auto' }} /><h1>{t('Dobra robota!')}</h1><p>{s.title}</p></Card>
        <div className="grid3">
          <Card className="center"><div className="bold num" style={{ fontSize: 22 }}>{fmtClock(s.durationSec)}</div><div className="tiny muted">{t('czas')}</div></Card>
          <Card className="center"><div className="bold num" style={{ fontSize: 22 }}>{sessionSets(s)}</div><div className="tiny muted">{t('serii')}</div></Card>
          <Card className="center"><div className="bold num" style={{ fontSize: 22 }}>{Math.round(vol)}</div><div className="tiny muted">{t('objętość kg')}</div></Card>
        </div>
        {prs.length > 0 && (
          <Card className="stack"><div className="row"><ITrophy style={{ color: 'var(--warn)', width: 24, height: 24 }} /><h3>{t('Nowe rekordy!')}</h3></div>
            {prs.map((p) => <div key={p.exId} className="small">{EX_BY_ID[p.exId]?.pl}: <b>{p.weight} kg × {p.reps}</b></div>)}</Card>
        )}
        <button className="btn primary big" onClick={() => { onClose(); nav.tab('progress'); }}>{t('Zobacz postępy')}</button>
        <button className="btn block" onClick={() => { onClose(); nav.tab('home'); }}>{t('Wróć do pulpitu')}</button>
      </div>
    </>
  );
}
