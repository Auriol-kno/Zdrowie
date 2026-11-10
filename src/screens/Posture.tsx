import { useEffect, useMemo, useRef, useState } from 'react';
import type { PostureConfig, PostureExCfg, PostureFocus } from '../core/types';
import { activePlan, getState, nav, savePlan, saveSettings, setDraft, useStore } from '../core/store';
import { t } from '../core/i18n';
import { EX_BY_ID } from '../data/exercises';
import { MUSCLES, DAY_NAMES_PL } from '../data/muscles';
import { POSTURE_CATALOG, catalogFor, cfgToItem, estimateItemSec, isAvoided, recommendedIds, resolveCfg } from '../data/posture';
import { startDraft } from '../engine/workout';
import { Card, Seg, Sheet, Slider, TopBar } from '../ui/components';
import { FigureThumb } from '../ui/Figure';
import { ICheck, IInfo, IWarn } from '../ui/icons';

const FOCUS_INFO: Record<PostureFocus | 'all', string> = {
  all: 'Zestaw ogólny: stabilizacja tułowia, kontrola miednicy i łopatek.',
  lordosis: 'Pogłębiona lordoza lędźwiowa często idzie w parze ze skróconymi zginaczami biodra i prostownikami grzbietu oraz osłabionym brzuchem i pośladkami. Ćwiczenia uczą kontroli miednicy, wzmacniają brzuch i pośladki, rozluźniają przód biodra.',
  scoliosis: 'Skolioza jest zróżnicowana (łuk, strona, stopień). Ćwiczenia ogólne poprawiają kontrolę postawy, oddech i siłę mięśni tułowia, ale NIE zastępują terapii prowadzonej przez fizjoterapeutę. Strony i dawki ustal indywidualnie.',
};

export function PostureScreen() {
  const saved = useStore((s) => s.settings.posture);
  const [focus, setFocus] = useState<PostureFocus | 'all'>(saved?.focus ?? 'all');
  const [cfg, setCfg] = useState<Record<string, PostureExCfg>>(saved?.cfg ?? {});
  const [dayPick, setDayPick] = useState(false);
  const first = useRef(true);

  const get = (id: string) => resolveCfg({ focus, cfg }, id);
  const patch = (id: string, p: Partial<PostureExCfg>) => setCfg((c) => ({ ...c, [id]: { ...get(id), ...p } }));

  // zapis ustawień z opóźnieniem (suwak generuje wiele zdarzeń)
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const h = setTimeout(() => { const posture: PostureConfig = { focus, cfg }; void saveSettings({ posture }); }, 350);
    return () => clearTimeout(h);
  }, [focus, cfg]);

  const list = useMemo(() => catalogFor(focus), [focus]);
  const chosen = list.filter((e) => get(e.id).on && !isAvoided(e.id, focus));
  const items = chosen.map((e) => cfgToItem(e.id, get(e.id)));
  const totalSec = items.reduce((n, it) => n + estimateItemSec(it), 0);

  const selectRecommended = () => setCfg((c) => { const n = { ...c }; for (const e of POSTURE_CATALOG) n[e.id] = { ...resolveCfg({ focus, cfg: c }, e.id), on: false }; for (const id of recommendedIds(focus)) n[id] = { ...resolveCfg({ focus, cfg: c }, id), on: true }; return n; });
  const clearAll = () => setCfg((c) => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, { ...v, on: false }])));

  const start = () => {
    if (!items.length) return;
    if (getState().draft) { nav.toast(t('Najpierw zakończ trwający trening.')); nav.tab('workout'); return; }
    void setDraft(startDraft({ title: t('Postawa i kręgosłup'), kind: 'mobility', items }));
    nav.tab('workout');
  };
  const plan = activePlan();
  const addToDay = (idx: number) => {
    if (!plan) return;
    const days = plan.days.map((d, i) => i !== idx ? d : { ...d, kind: d.kind === 'rest' ? 'mobility' as const : d.kind, title: d.kind === 'rest' ? t('Postawa i kręgosłup') : d.title, items: [...d.items, ...items] });
    void savePlan({ ...plan, days }); setDayPick(false); nav.toast(t('Dodano do planu'));
  };

  return (
    <div className="overlay">
      <TopBar title={t('Postawa i kręgosłup')} onBack={nav.pop} />
      <main className="main stack">
        <Card className="warn stack" label={t('Ważne')}>
          <div className="row"><IWarn style={{ flexShrink: 0 }} /><b>{t('To nie jest terapia ani diagnoza')}</b></div>
          <div className="small">{t('Ćwiczenia mają charakter ogólny. Przy rozpoznanej skoliozie lub bólu pleców skonsultuj plan z fizjoterapeutą lub lekarzem. Przerwij przy bólu, drętwieniu lub mrowieniu. Jeśli dostałeś(-aś) inne zalecenia (strona, dawka), trzymaj się ich.')}</div>
        </Card>

        <Seg value={focus} onChange={setFocus} options={[{ v: 'all', label: t('Wszystkie') }, { v: 'lordosis', label: t('Lordoza') }, { v: 'scoliosis', label: t('Skolioza') }]} />
        <div className="small muted">{t(FOCUS_INFO[focus])}</div>

        <div className="row wrap">
          <button className="btn sm" onClick={selectRecommended}><ICheck />{t('Zestaw rekomendowany')}</button>
          <button className="btn sm" onClick={clearAll}>{t('Odznacz wszystkie')}</button>
        </div>

        <div className="stack sm" role="list">
          {list.map((e) => {
            const ex = EX_BY_ID[e.id]; if (!ex) return null;
            const c = get(e.id); const avoided = isAvoided(e.id, focus); const open = c.on && !avoided;
            return (
              <div key={e.id} className={`card pex ${open ? 'on' : ''}`} role="listitem">
                <div className="row">
                  <button className="row grow" style={{ background: 'none', border: 0, textAlign: 'left', padding: 0, minHeight: 56 }} role="checkbox" aria-checked={open} disabled={avoided}
                    onClick={() => patch(e.id, { on: !c.on })} aria-label={ex.pl}>
                    <FigureThumb animationId={ex.animationId} fallback={ex.pl} />
                    <span className="grow">
                      <div className="bold">{ex.pl}</div>
                      <div className="small muted">{ex.primary.map((m) => t(MUSCLES[m].pl)).join(', ')}</div>
                      <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
                        {e.rec && !avoided && <span className="tag teal">{t('rekomendowane')}</span>}
                        {avoided && <span className="tag warn">{t('niewskazane przy lordozie')}</span>}
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
        <div style={{ height: 96 }} />
      </main>
      <footer className="actionbar">
        <div className="small" aria-live="polite"><b>{t('Wybrano: {n}', { n: chosen.length })}</b> · ~{Math.max(1, Math.round(totalSec / 60))} min</div>
        <div className="row">
          <button className="btn primary grow" disabled={!items.length} onClick={start}>{t('Rozpocznij sesję')}</button>
          <button className="btn" disabled={!items.length} onClick={() => (plan ? setDayPick(true) : nav.toast(t('Brak aktywnego planu')))}>{t('Zapisz w planie')}</button>
        </div>
      </footer>
      {dayPick && plan && (
        <Sheet title={t('Dodaj do dnia planu')} onClose={() => setDayPick(false)}>
          <div className="stack sm">{plan.days.map((d, i) => <button key={i} className="list-item" onClick={() => addToDay(i)}><span className="grow"><b>{t(DAY_NAMES_PL[i])}</b><div className="small muted">{d.kind === 'rest' ? t('Odpoczynek') : d.title}</div></span></button>)}</div>
        </Sheet>
      )}
    </div>
  );
}
