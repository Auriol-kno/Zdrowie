import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IBack, ICheck, IClose, IMinus, IPlus } from './icons';
import { t } from '../core/i18n';

export function TopBar({ title, onBack, right, brand }: { title?: ReactNode; onBack?: () => void; right?: ReactNode; brand?: boolean }) {
  return (
    <header className="topbar">
      {onBack && <button className="iconbtn" onClick={onBack} aria-label={t('Wstecz')}><IBack /></button>}
      <h1 className={`title ${brand ? 'brand' : ''}`} style={{ fontSize: 19 }}><span className="t">{title}</span></h1>
      {right}
    </header>
  );
}

export function Card({ children, className = '', onClick, label }: { children: ReactNode; className?: string; onClick?: () => void; label?: string }) {
  if (onClick) return <button className={`card btn ${className}`} onClick={onClick} aria-label={label}>{children}</button>;
  return <div className={`card ${className}`}>{children}</div>;
}

export function Section({ title, children, right }: { title: string; children?: ReactNode; right?: ReactNode }) {
  return (<><div className="row between"><div className="section-title">{title}</div>{right}</div>{children}</>);
}

export function Chip({ on, onClick, children }: { on?: boolean; onClick?: () => void; children: ReactNode }) {
  return <button className="chip" aria-pressed={!!on} onClick={onClick}>{children}</button>;
}

export function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group">
      {options.map((o) => <button key={String(o.v)} aria-pressed={o.v === value} onClick={() => onChange(o.v)}>{o.label}</button>)}
    </div>
  );
}

export function Choice({ on, onClick, icon, title, sub, multi }: { on: boolean; onClick: () => void; icon?: ReactNode; title: ReactNode; sub?: ReactNode; multi?: boolean }) {
  return (
    <button className="choice" aria-pressed={on} onClick={onClick} role={multi ? 'checkbox' : 'radio'} aria-checked={on}>
      {icon && <span className="ico">{icon}</span>}
      <span className="grow"><div className="bold">{title}</div>{sub && <div className="small muted">{sub}</div>}</span>
      <span className="tick">{on && <ICheck />}</span>
    </button>
  );
}

export function Switch({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; sub?: ReactNode }) {
  return (
    <button className="switch" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span><div className="bold">{label}</div>{sub && <div className="small muted">{sub}</div>}</span>
      <span className="knob" />
    </button>
  );
}

/** Pole liczbowe z przyciskami +/− (duże cele dotykowe). */
export function Stepper({ value, onChange, step = 1, min = 0, max = 9999, unit, label, decimals = 0 }: {
  value: number | null; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit?: string; label: string; decimals?: number;
}) {
  const [text, setText] = useState<string | null>(null);
  const v = value ?? 0;
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100));
  return (
    <div className="stepper">
      <button aria-label={`${label}: −`} onClick={() => onChange(clamp(v - step))}><IMinus /></button>
      <input
        aria-label={label} inputMode="decimal" value={text ?? (value == null ? '' : value.toFixed(decimals))}
        onFocus={(e) => { setText(value == null ? '' : String(value)); e.target.select(); }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => { if (text != null) { const n = parseFloat(text.replace(',', '.')); if (!Number.isNaN(n)) onChange(clamp(n)); } setText(null); }}
      />
      <button aria-label={`${label}: +`} onClick={() => onChange(clamp(v + step))}><IPlus /></button>
      {unit && <span className="unit">{unit}</span>}
    </div>
  );
}

export function Slider({ label, value, onChange, min, max, step = 1, unit, format }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string; format?: (v: number) => string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="slider">
      <span className="row between"><span className="slider-label">{label}</span><span className="slider-val num">{format ? format(value) : value}{unit ? ` ${unit}` : ''}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} aria-label={label} aria-valuetext={`${format ? format(value) : value}${unit ? ' ' + unit : ''}`}
        style={{ ['--pct' as string]: `${pct}%` }} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function Sheet({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="sheet-bg" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} tabIndex={-1} ref={ref}>
        <div className="grab" />
        <div className="row between" style={{ marginBottom: 10 }}>
          <h2>{title}</h2>
          <button className="iconbtn" onClick={onClose} aria-label={t('Zamknij')}><IClose /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({ title, text, confirmLabel, danger, onYes, onNo }: { title: string; text: ReactNode; confirmLabel: string; danger?: boolean; onYes: () => void; onNo: () => void }) {
  return (
    <Sheet title={title} onClose={onNo}>
      <div className="stack">
        <div className="muted">{text}</div>
        <div className="grid2">
          <button className="btn" onClick={onNo}>{t('Anuluj')}</button>
          <button className={`btn ${danger ? 'danger' : 'primary'}`} onClick={onYes}>{confirmLabel}</button>
        </div>
      </div>
    </Sheet>
  );
}

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="card flat center stack" style={{ alignItems: 'center', padding: 28 }}>
      {icon && <div style={{ color: 'var(--teal)', width: 40, height: 40 }}>{icon}</div>}
      <h3>{title}</h3>
      {text && <p className="muted small">{text}</p>}
      {action}
    </div>
  );
}

export function Ring({ value, size = 120, stroke = 10, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--teal)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <div className="in">{children}</div>
    </div>
  );
}

export function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const id = setTimeout(onDone, 3800); return () => clearTimeout(id); }, [msg, onDone]);
  return <div className="toast" role="status">{msg}</div>;
}

/** Odświeża komponent co `ms` — do zegarów liczonych ze znacznika czasu. */
export function useTick(ms = 250, active = true) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => set((x) => x + 1), ms);
    const vis = () => set((x) => x + 1);
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [ms, active]);
}

export function download(name: string, data: string, mime: string) {
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
