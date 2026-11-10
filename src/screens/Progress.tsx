import { useMemo, useState } from 'react';
import type { SessionRecord } from '../core/types';
import { addMeasurement, deleteMeasurement, deleteSession, nav, useStore } from '../core/store';
import { t } from '../core/i18n';
import { EX_BY_ID } from '../data/exercises';
import { DAY_SHORT_PL } from '../data/muscles';
import { activeStreak, consistencyGrid, exerciseHistory, personalRecords, sessionSets, sessionVolume, weeklySeries } from '../engine/stats';
import { dateKey, fmtClock, parseKey } from '../core/time';
import { Card, Chip, Confirm, Empty, Section, Seg, Sheet, Stepper, TopBar } from '../ui/components';
import { BarChart, LineChart } from '../ui/charts';
import { IFlame, IPlus, IRight, ITrash, ITrophy } from '../ui/icons';

type Metric = 'sessions' | 'volume' | 'sets' | 'minutes' | 'mobilityMin';
const METRICS: { id: Metric; pl: string; unit: string }[] = [
  { id: 'sessions', pl: 'Treningi', unit: '' }, { id: 'volume', pl: 'Objętość (kg)', unit: ' kg' }, { id: 'sets', pl: 'Serie', unit: '' },
  { id: 'minutes', pl: 'Czas aktywny (min)', unit: ' min' }, { id: 'mobilityMin', pl: 'Mobilność (min)', unit: ' min' },
];
const shortDate = (k: string) => { const d = parseKey(k); return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`; };

export function ProgressScreen() {
  const sessions = useStore((s) => s.sessions);
  const meas = useStore((s) => s.measurements);
  const [metric, setMetric] = useState<Metric>('sessions');
  const [exId, setExId] = useState<string | null>(null);
  const [open, setOpen] = useState<SessionRecord | null>(null);
  const [addM, setAddM] = useState(false);
  const [delM, setDelM] = useState<string | null>(null);

  const series = useMemo(() => weeklySeries(sessions, 8), [sessions]);
  const prs = useMemo(() => Object.values(personalRecords(sessions)).sort((a, b) => b.date.localeCompare(a.date)), [sessions]);
  const streak = useMemo(() => activeStreak(sessions), [sessions]);
  const grid = useMemo(() => consistencyGrid(sessions, 10), [sessions]);
  const performed = useMemo(() => [...new Set(sessions.flatMap((s) => s.items.filter((i) => i.sets.some((x) => x.done)).map((i) => i.exId)))].filter((id) => EX_BY_ID[id]), [sessions]);
  const sel = exId && performed.includes(exId) ? exId : performed[0] ?? null;
  const hist = useMemo(() => (sel ? exerciseHistory(sessions, sel) : []), [sessions, sel]);
  const names = useMemo(() => [...new Set(meas.map((m) => m.name))], [meas]);
  const [mName, setMName] = useState<string | null>(null);
  const mSel = mName && names.includes(mName) ? mName : names[0] ?? null;

  const total = sessions.length;
  const m = METRICS.find((x) => x.id === metric)!;
  const mobSessions = sessions.filter((s) => s.kind === 'mobility').length;

  return (
    <>
      <TopBar title={t('Postępy')} />
      <div className="main stack">
        {total === 0 ? (
          <Empty icon={<ITrophy style={{ width: 40, height: 40 }} />} title={t('Brak danych treningowych')} text={t('Po pierwszym zapisanym treningu zobaczysz tu wykresy, rekordy i historię.')} action={<button className="btn primary" onClick={() => nav.tab('workout')}>{t('Zacznij trening')}</button>} />
        ) : (<>
          <div className="grid3">
            <Card className="center"><div className="bold num" style={{ fontSize: 24 }}>{total}</div><div className="tiny muted">{t('treningów')}</div></Card>
            <Card className="center"><div className="bold num" style={{ fontSize: 24 }}><IFlame style={{ width: 20, height: 20, color: 'var(--warn)', verticalAlign: -3 }} />{streak}</div><div className="tiny muted">{t('tyg. z rzędu')}</div></Card>
            <Card className="center"><div className="bold num" style={{ fontSize: 24 }}>{mobSessions}</div><div className="tiny muted">{t('sesji mobilności')}</div></Card>
          </div>

          <Card className="stack">
            <div className="chips">{METRICS.map((x) => <Chip key={x.id} on={metric === x.id} onClick={() => setMetric(x.id)}>{t(x.pl)}</Chip>)}</div>
            <BarChart label={t(m.pl)} unit={m.unit} data={series.map((w) => ({ label: shortDate(w.weekStart), value: Math.round(w[metric]) }))} />
            <div className="tiny faint">{t('Ostatnie 8 tygodni (początek tygodnia).')}</div>
          </Card>

          <Section title={t('Regularność')}>
            <Card>
              <div className="row tiny faint" style={{ justifyContent: 'space-between', marginBottom: 4 }}>{DAY_SHORT_PL.map((d) => <span key={d} style={{ width: '14%', textAlign: 'center' }}>{t(d)}</span>)}</div>
              <div className="heat" role="img" aria-label={t('Mapa regularności ostatnich 10 tygodni')}>
                {grid.flat().map((c) => <i key={c.date} title={c.date} className={c.count >= 3 ? 'l3' : c.count === 2 ? 'l2' : c.count === 1 ? 'l1' : ''} />)}
              </div>
            </Card>
          </Section>

          {prs.length > 0 && (
            <Section title={t('Rekordy osobiste')}>
              <div className="stack sm">{prs.slice(0, 8).map((p) => (
                <div key={p.exId} className="list-item"><ITrophy style={{ color: 'var(--warn)', width: 22, height: 22 }} /><span className="grow"><div className="bold">{EX_BY_ID[p.exId]?.pl}</div><div className="small muted">{p.date}</div></span><b className="num">{p.weight} kg × {p.reps}</b></div>))}
              </div>
              <div className="tiny faint">{t('Rekord = największy ciężar z ≥1 powtórzeniem; szac. 1RM wg wzoru Epleya.')}</div>
            </Section>
          )}

          {sel && (
            <Section title={t('Historia ćwiczenia')}>
              <div className="stack">
                <select className="input" value={sel} onChange={(e) => setExId(e.target.value)} aria-label={t('Wybierz ćwiczenie')}>{performed.map((id) => <option key={id} value={id}>{EX_BY_ID[id].pl}</option>)}</select>
                {hist.some((h) => h.topWeight > 0)
                  ? <Card><LineChart label={t('Największy ciężar')} unit=" kg" data={hist.map((h) => ({ label: shortDate(h.date), value: h.topWeight }))} /><div className="tiny faint">{t('Największy ciężar w sesji (kg)')}</div></Card>
                  : <Card><LineChart label={t('Powtórzenia')} data={hist.map((h) => ({ label: shortDate(h.date), value: h.reps }))} /><div className="tiny faint">{t('Powtórzenia w sesji')}</div></Card>}
              </div>
            </Section>
          )}

          <Section title={t('Historia treningów')}>
            <div className="stack sm">{[...sessions].reverse().slice(0, 30).map((s) => (
              <button key={s.id} className="list-item" onClick={() => setOpen(s)}>
                <span className="grow"><div className="bold">{s.title}</div><div className="small muted">{s.date} · {fmtClock(s.durationSec)} · {sessionSets(s)} {t('serii')}</div></span><IRight style={{ color: 'var(--faint)' }} />
              </button>))}</div>
          </Section>
        </>)}

        <Section title={t('Pomiary zakresu ruchu (opcjonalnie)')} right={<button className="chip" onClick={() => setAddM(true)}><IPlus style={{ width: 16, height: 16 }} />{t('Dodaj')}</button>}>
          <Card className="stack">
            <p className="small muted">{t('Wpisz własny pomiar, np. „dotknięcie palców — odległość od podłogi (cm)” albo „kąt wykroku (°)”. Sam czas rozciągania nie jest miarą elastyczności, dlatego aplikacja go tak nie traktuje.')}</p>
            {names.length > 0 && <>
              <div className="chips">{names.map((n) => <Chip key={n} on={mSel === n} onClick={() => setMName(n)}>{n}</Chip>)}</div>
              <LineChart label={mSel ?? ''} data={meas.filter((x) => x.name === mSel).map((x) => ({ label: shortDate(x.date), value: x.value }))} />
              <div className="stack sm">{meas.filter((x) => x.name === mSel).slice().reverse().slice(0, 5).map((x) => <div key={x.id} className="row between small"><span>{x.date} · <b>{x.value} {x.unit}</b>{x.note ? ` · ${x.note}` : ''}</span><button className="iconbtn" aria-label={t('Usuń pomiar')} onClick={() => setDelM(x.id)}><ITrash style={{ width: 18, height: 18 }} /></button></div>)}</div>
            </>}
          </Card>
        </Section>
      </div>

      {open && <SessionSheet s={open} onClose={() => setOpen(null)} />}
      {addM && <MeasureSheet names={names} onClose={() => setAddM(false)} />}
      {delM && <Confirm danger title={t('Usunąć pomiar?')} text="" confirmLabel={t('Usuń')} onNo={() => setDelM(null)} onYes={() => { void deleteMeasurement(delM); setDelM(null); }} />}
    </>
  );
}

function SessionSheet({ s, onClose }: { s: SessionRecord; onClose: () => void }) {
  const [del, setDel] = useState(false);
  return (
    <Sheet title={s.title} onClose={onClose}>
      <div className="stack">
        <div className="small muted">{s.date} · {fmtClock(s.durationSec)} · {Math.round(sessionVolume(s))} kg{s.rpe ? ` · RPE ${s.rpe}` : ''}{s.mood ? ` · ${['😣', '😕', '😐', '🙂', '😄'][s.mood - 1]}` : ''}{s.distanceM ? ` · ${s.distanceM} m` : ''}</div>
        {s.prs && s.prs.length > 0 && <div className="tag warn">🏆 {s.prs.length} {t('rekord(y)')}</div>}
        {s.items.map((it, i) => (<div key={i} className="card flat"><b>{EX_BY_ID[it.exId]?.pl ?? it.exId}</b><div className="small muted">{it.sets.filter((x) => x.done).map((x) => x.seconds && !x.reps ? `${x.seconds}s` : `${x.weight ? `${x.weight}kg × ` : ''}${x.reps ?? '?'}`).join(' · ')}</div></div>))}
        {s.notes && <div className="small">📝 {s.notes}</div>}
        <button className="btn danger" onClick={() => setDel(true)}><ITrash />{t('Usuń trening z historii')}</button>
      </div>
      {del && <Confirm danger title={t('Usunąć trening?')} text={t('Tej operacji nie można cofnąć.')} confirmLabel={t('Usuń')} onNo={() => setDel(false)} onYes={() => { void deleteSession(s.id); onClose(); }} />}
    </Sheet>
  );
}

function MeasureSheet({ names, onClose }: { names: string[]; onClose: () => void }) {
  const [name, setName] = useState(names[0] ?? '');
  const [value, setValue] = useState<number | null>(null);
  const [unit, setUnit] = useState('cm');
  const [note, setNote] = useState('');
  return (
    <Sheet title={t('Nowy pomiar')} onClose={onClose}>
      <div className="stack">
        <div className="field"><label htmlFor="mn">{t('Nazwa pomiaru')}</label><input id="mn" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('np. skłon do przodu')} list="mnames" /><datalist id="mnames">{names.map((n) => <option key={n} value={n} />)}</datalist></div>
        <div className="field"><label>{t('Wartość')}</label><Stepper label={t('Wartość')} value={value} step={0.5} decimals={1} max={9999} onChange={setValue} /></div>
        <div className="field"><label>{t('Jednostka')}</label><Seg value={unit} onChange={setUnit} options={['cm', '°', 'kg', 's'].map((u) => ({ v: u, label: u }))} /></div>
        <div className="field"><label htmlFor="mnote">{t('Notatka')}</label><input id="mnote" className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <button className="btn primary" disabled={!name.trim() || value === null} onClick={() => { void addMeasurement({ date: dateKey(), name: name.trim(), value: value!, unit, note: note.trim() || undefined }); onClose(); }}>{t('Zapisz pomiar')}</button>
      </div>
    </Sheet>
  );
}
