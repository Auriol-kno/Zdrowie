import { useEffect, useMemo, useRef, useState } from 'react';
import { getAnim } from '../data/poses';
import { HOLD_MS, VIEW_H, VIEW_W, VIEW_Y, cycleMs, resolveSpec, sampleAt, sequence, traceOf } from '../engine/figure';
import { figureInner, SVG_STYLE } from '../engine/figureSvg';
import { t } from '../core/i18n';
import { IPause, IPlay } from './icons';

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Animacja techniki ćwiczenia: play/pauza, etapy ruchu, tor. Gdy brak animacji — uczciwa informacja. */
export function Figure({ animationId, hint }: { animationId: string | null; hint?: string }) {
  const anim = getAnim(animationId);
  if (!anim) {
    return (
      <div className="figbox"><div className="noanim">
        <strong>{t('Brak animacji dla tego ćwiczenia')}</strong>
        <span className="small">{hint ?? t('Skorzystaj z opisu kroków, wskazówek i typowych błędów poniżej.')}</span>
      </div></div>
    );
  }
  return <AnimatedFigure key={anim.id} animId={anim.id} />;
}

function AnimatedFigure({ animId }: { animId: string }) {
  const anim = getAnim(animId)!;
  const isStatic = anim.loop === 'static' || anim.frames.length === 1;
  const resolved = useMemo(() => anim.frames.map((f) => resolveSpec(f.pose)), [anim]);
  const trace = useMemo(() => (anim.trace ? traceOf(anim) : undefined), [anim]);
  const [playing, setPlaying] = useState(!reduced() && !isStatic);
  const [showTrace, setShowTrace] = useState(true);
  const [stage, setStage] = useState(0);
  const g = useRef<SVGGElement>(null);
  const clock = useRef({ t: 0, last: 0 });
  const lastStage = useRef(-1);

  const draw = () => {
    const s = sampleAt(anim, clock.current.t, resolved);
    if (g.current) g.current.innerHTML = figureInner(anim, s.pose, showTrace ? trace : undefined);
    if (s.stage !== lastStage.current) { lastStage.current = s.stage; setStage(s.stage); }
  };

  useEffect(() => {
    draw();
    if (!playing || isStatic) return;
    let raf = 0;
    clock.current.last = performance.now();
    const loop = (now: number) => {
      clock.current.t += now - clock.current.last; clock.current.last = now; draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, showTrace, animId]);

  const goStage = (i: number) => {
    const seq = sequence(anim);
    const pos = Math.max(0, seq.indexOf(i));
    clock.current.t = pos * (anim.ms + HOLD_MS) + 1;
    setPlaying(false); draw();
  };

  return (
    <div className="stack sm">
      <div className="figbox">
        <svg viewBox={`0 ${VIEW_Y} ${VIEW_W} ${VIEW_H}`} role="img" aria-label={t('Animacja techniki: {s}', { s: anim.frames[stage]?.label ?? '' })}>
          <style>{SVG_STYLE}</style>
          <g ref={g} />
        </svg>
        <span className="tag blue badge">{isStatic ? t('Poza statyczna (bez animacji ruchu)') : t('Animacja 2D · widok z boku')}</span>
      </div>
      {!isStatic && (
        <div className="row">
          <button className="btn sm" onClick={() => setPlaying((p) => !p)} aria-label={playing ? t('Pauza') : t('Odtwórz')}>{playing ? <IPause /> : <IPlay />}{playing ? t('Pauza') : t('Odtwórz')}</button>
          {anim.trace && <button className="chip" aria-pressed={showTrace} onClick={() => setShowTrace((v) => !v)}>{t('Tor ruchu')}</button>}
        </div>
      )}
      {!isStatic && (
        <div className="chips" role="group" aria-label={t('Etapy ruchu')}>
          {anim.frames.map((f, i) => <button key={i} className="chip" aria-pressed={stage === i} onClick={() => goStage(i)}>{i + 1}. {f.label}</button>)}
        </div>
      )}
      {isStatic && <div className="small muted">{anim.frames[0]?.label}</div>}
      {anim.note && <div className="small muted">{anim.note}</div>}
      <div className="tiny faint">{t('Schematyczna ilustracja pomocnicza — nie jest nagraniem wzorcowej techniki.')}</div>
    </div>
  );
}

/** Mała statyczna miniatura do list (pierwsza klatka); brak animacji → inicjały. */
export function FigureThumb({ animationId, fallback }: { animationId: string | null; fallback: string }) {
  const anim = getAnim(animationId);
  const html = useMemo(() => {
    if (!anim) return '';
    const mid = anim.frames.length > 1 ? Math.floor((anim.frames.length - 1) / 2 + (anim.frames.length > 2 ? 0 : 1)) : 0;
    return figureInner(anim, resolveSpec(anim.frames[mid].pose));
  }, [anim]);
  if (!anim) return <div className="thumb tiny bold" aria-hidden="true">{fallback.slice(0, 2).toUpperCase()}</div>;
  return (
    <div className="thumb" aria-hidden="true">
      <svg viewBox={`10 ${VIEW_Y + 6} ${VIEW_W - 20} ${VIEW_H - 8}`}><style>{SVG_STYLE}</style><g dangerouslySetInnerHTML={{ __html: html }} /></svg>
    </div>
  );
}
export { cycleMs };
