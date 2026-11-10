import { useEffect, useMemo, useRef, useState } from 'react';
import type { BuilderState, PostureExCfg, SavedSet, SectionId } from '../core/types';
import { activePlan, getState, nav, savePlan, saveSettings, setDraft, useStore } from '../core/store';
import { t } from '../core/i18n';
import { uid } from '../core/time';
import { EX_BY_ID } from '../data/exercises';
import { MUSCLES, DAY_NAMES_PL } from '../data/muscles';
import { cfgToItem, estimateItemSec, resolveCfg } from '../data/posture';
import { SECTIONS } from '../data/builder';
import { startDraft } from '../engine/workout';
import { Card, Seg, Sheet, Slider, TopBar } from '../ui/components';
import { FigureThumb } from '../ui/Figure';
import { ICheck, IClose, IInfo, IWarn } from '../ui/icons';

/** Wspólny ekran sekcji „Kręgosłup” i „Rozciąganie”: wybór ćwiczeń, konfiguracja setów, zestawy własne. */
export function BuilderScreen({ section }: { section: SectionId }) {
  const def = SECTIONS[section];
  const settings = useStore((s) => s.settings);
  const saved: BuilderState | undefined = settings.builders?.[section] ?? (section === 'spine' && settings.posture ? { filter: settings.posture.focus, cfg: settings.posture.cfg } : undefined);
  const [filter, setFilter] = useState<string>(saved && def.filters.some((f) => f.v === saved.filter) ? saved.filter : 'all');
  const [cfg, setCfg] = useState<Record<string, PostureExCfg>>(saved?.cfg ?? {});
  const [dayPick, setDayPick] = useState(false);
  const [nameSheet, setNameSheet] = useState(false);
  const [name, setName] = useState('');
  const first = useRef(true);
  const sets = (settings.savedSets ?? []).filter((x) => x.section === section);

  const get = (id: string) => resolveCfg({ cfg }, id);
  const patch = (id: string, p: Partial<PostureExCfg>) => setCfg((c) => ({ ...c, [id]: { ...get(id), ...p } }));

  // zapis z opóźnieniem (suwak generuje wiele zdarzeń)
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const h = setTimeout(() => { void saveSettings({ builders: { ...getState().settings.builders, [section]: { filter, cfg } } }); }, 350);
    return () => clearTimeout(h);
  }, [filter, cfg, section]);

  const list = useMemo(() => def.catalog(filter), [def, filter]);
  const chosen = list.filter((e) => get(e.id).on && !e.avoid);
  const items = chosen.map((e) => cfgToItem(e.id, get(e.id)));
  const totalSec = items.reduce((n, it) => n + estimateItemSec(it), 0);

  const selectRecommended = () => setCfg((c) => {
    const rec = new Set(def.recommended(filter)); const n = { ...c };
    for (const e of list) n[e.id] = { ...resolveCfg({ cfg: c }, e.id), on: rec.has(e.id) };
    return n;
  });
  const clearAll = () => setCfg((c) => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, { ...v, on: false }])));

  const start = (title = t(def.pl)) => {
    if (!items.length) return;
    if (getState().draft) { nav.toast(t('Najpierw zakończ trwający trening.')); nav.tab('workout'); return; }
    void setDraft(startDraft({ title, kind: 'mobility', items }));
    nav.tab('workout');
  };
  const plan = activePlan();
  const addToDay = (idx: number) => {
    if (!plan) return;
    const days = plan.days.map((d, i) => i !== idx ? d : { ...d, kind: d.kind === 'rest' ? 'mobility' as const : d.kind, title: d.kind === 'rest' ? t(def.pl) : d.title, items: [...d.items, ...items] });
    void savePlan({ ...plan, days }); setDayPick(false); nav.toast(t('Dodano do planu'));
  };

  const saveSet = () => {
    const nm = name.trim(); if (!nm || !chosen.length) return;
    const s: SavedSet = { id: uid('set'), name: nm, section, items: chosen.map((e) => ({ id: e.id, cfg: { ...get(e.id), on: true } })) };
    void saveSettings({ savedSets: [...(getState().settings.savedSets ?? []), s] });
    setNameSheet(false); setName(''); nav.toast(t('Zapisano zestaw „{n}”', { n: nm }));
  };
  const loadSet = (s: SavedSet) => {
    setFilter('all');
    setCfg((c) => { const n: Record<string, PostureExCfg> = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, { ...v, on: false }])); for (const it of s.items) if (EX_BY_ID[it.id]) n[it.id] = { ...it.cfg, on: true }; return n; });
    nav.toast(t('Wczytano zestaw „{n}”', { n: s.name }));
  };
  const delSet = (s: SavedSet) => void saveSettings({ savedSets: (getState().settings.savedSets ?? []).filter((x) => x.id !== s.id) });

  return (
    <div className="overlay">
      <TopBar title={t(def.pl)} onBack={nav.pop} />
      <main className="main stack">
        <Card className="warn stack" label={t('Ważne')}>
          <div className="row"><IWarn style={{ flexShrink: 0 }} /><b>{t(def.disclaimerTitle)}</b></div>
          <div className="small">{t(def.disclaimer)}</div>
        </Card>

        <div className="chips" role="group" aria-label={t('Filtr')}>
          {def.filters.map((f) => <button key={f.v} className="chip" aria-pressed={filter === f.v} onClick={() => setFilter(f.v)}>{t(f.pl)}</button>)}
        </div>
        <div className="small muted">{t(def.info(filter))}</div>

        <div className="stack sm">
          <div className="section-title">{t('Moje zestawy')}</div>
          {sets.length === 0 ? <div className="small muted">{t('Brak zapisanych zestawów. Wybierz ćwiczenia, ustaw serie i zapisz je jako własny zestaw.')}</div> : (
            <div className="chips wrap">
              {sets.map((s) => (
                <span key={s.id} className="setchip">
                  <button className="chip" onClick={() => loadSet(s)} aria-label={t('Wczytaj zestaw {n}', { n: s.name })}>{s.name} · {s.items.length}</button>
                  <button className="iconbtn xs" onClick={() => delSet(s)} aria-label={t('Usuń zestaw {n}', { n: s.name })}><IClose /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="row wrap">
          <button className="btn sm" onClick={selectRecommended}><ICheck />{t('Zestaw rekomendowany')}</button>
          <button className="btn sm" onClick={clearAll}>{t('Odznacz wszystkie')}</button>
        </div>

        <div className="stack sm" role="list">
          {list.map((e) => {
            const ex = EX_BY_ID[e.id]; if (!ex) return null;
            const c = get(e.id); const open = c.on && !e.avoid;
            const avoidLabel = e.avoid ? def.avoidedLabel(filter) : null;
            return (
              <div key={e.id} className={`card pex ${open ? 'on' : ''}`} role="listitem">
                <div className="row">
                  <button className="row grow" style={{ background: 'none', border: 0, textAlign: 'left', padding: 0, minHeight: 56 }} role="checkbox" aria-checked={open} disabled={e.avoid}
                    onClick={() => patch(e.id, { on: !c.on })} aria-label={ex.pl}>
                    <FigureThumb animationId={ex.animationId} fallback={ex.pl} />
                    <span className="grow">
                      <div className="bold">{ex.pl}</div>
                      <div className="small muted">{ex.primary.map((m) => t(MUSCLES[m].pl)).join(', ')}</div>
                      <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
                        {e.rec && !e.avoid && <span className="tag teal">{t('rekomendowane')}</span>}
                        {avoidLabel && <span className="tag warn">{t(avoidLabel)}</span>}
                      </div>
                    </span>
                    <span className={`tick ${open ? 'on' : ''}`} aria-hidden="true">{open && <ICheck />}</span>
                  </button>
                  <button className="iconbtn" onClick={() => nav.push({ name: 'exercise', id: e.id })} aria-label={t('Szczegóły: {n}', { n: ex.pl })}><IInfo /></button>
                </div>
                {e.note && <div className="small muted" style={{ marginTop: 6 }}>{t(e.note)}</div>}
                {open && (
                  <div className="stack cfgpanel">
                    <Slider label={t('Serie')} value={c.sets} min={1} max={6} onChange={(v) => patch(e.id, { sets: v })} />
                    <Seg value={c.mode} onChange={(v) => patch(e.id, { mode: v })} options={[{ v: 'reps', label: t('Powtórzenia') }, { v: 'time', label: t('Czas') }]} />
                    {c.mode === 'reps' ? (
                      <>
                        <Slider label={t('Powtórzenia')} value={c.reps} min={1} max={30} onChange={(v) => patch(e.id, { reps: v })} />
                        <Slider label={t('Utrzymanie w powtórzeniu')} value={c.hold} min={0} max={30} unit="s" format={(v) => (v === 0 ? t('brak') : String(v))} onChange={(v) => patch(e.id, { hold: v })} />
                      </>
                    ) : (
                      <Slider label={t('Czas ćwiczenia')} value={c.seconds} min={5} max={120} step={5} unit="s" onChange={(v) => patch(e.id, { seconds: v })} />
                    )}
                    <Slider label={t('Przerwa')} value={c.rest} min={0} max={120} step={5} unit="s" onChange={(v) => patch(e.id, { rest: v })} />
                    {ex.scheme.perSide && <div className="small muted">{t('Ćwiczenie wykonuje się na każdą stronę — podane wartości dotyczą jednej strony.')}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ height: 120 }} />
      </main>
      <footer className="actionbar">
        <div className="small" aria-live="polite"><b>{t('Wybrano: {n}', { n: chosen.length })}</b> · ~{Math.max(1, Math.round(totalSec / 60))} min</div>
        <button className="btn primary block" disabled={!items.length} onClick={() => start()}>{t('Rozpocznij sesję')}</button>
        <div className="grid2">
          <button className="btn sm" disabled={!items.length} onClick={() => (plan ? setDayPick(true) : nav.toast(t('Brak aktywnego planu')))}>{t('Zapisz w planie')}</button>
          <button className="btn sm" disabled={!items.length} onClick={() => setNameSheet(true)}>{t('Zapisz zestaw')}</button>
        </div>
      </footer>
      {dayPick && plan && (
        <Sheet title={t('Dodaj do dnia planu')} onClose={() => setDayPick(false)}>
          <div className="stack sm">{plan.days.map((d, i) => <button key={i} className="list-item" onClick={() => addToDay(i)}><span className="grow"><b>{t(DAY_NAMES_PL[i])}</b><div className="small muted">{d.kind === 'rest' ? t('Odpoczynek') : d.title}</div></span></button>)}</div>
        </Sheet>
      )}
      {nameSheet && (
        <Sheet title={t('Zapisz własny zestaw')} onClose={() => setNameSheet(false)}>
          <div className="stack">
            <div className="field"><label htmlFor="setname">{t('Nazwa zestawu')}</label><input id="setname" className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('np. Poranny kręgosłup')} /></div>
            <div className="small muted">{t('Zapisze {n} ćwiczeń wraz z ustawieniami serii, powtórzeń i czasu.', { n: chosen.length })}</div>
            <button className="btn primary" disabled={!name.trim()} onClick={saveSet}>{t('Zapisz')}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
