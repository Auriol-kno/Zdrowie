// Własne, lekkie wykresy SVG (bez zewnętrznych bibliotek) — responsywne, z opisami dla czytników ekranu.
export interface Pt { label: string; value: number }

const W = 320, H = 150, PL = 30, PR = 8, PT = 10, PB = 22;

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n * 10) / 10));

export function BarChart({ data, label, unit = '' }: { data: Pt[]; label: string; unit?: string }) {
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const bw = (W - PL - PR) / Math.max(1, data.length);
  const y = (v: number) => PT + (H - PT - PB) * (1 - v / max);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${d.value}${unit}`).join(', ')}`}>
      {[0, 0.5, 1].map((f) => <g key={f}><line className="grid" x1={PL} x2={W - PR} y1={y(max * f)} y2={y(max * f)} /><text x={PL - 4} y={y(max * f) + 3} textAnchor="end">{fmt(max * f)}</text></g>)}
      {data.map((d, i) => (
        <g key={i}>
          <rect className="bar-r" x={PL + i * bw + bw * 0.18} width={bw * 0.64} y={y(d.value)} height={Math.max(d.value > 0 ? 2 : 0, H - PB - y(d.value))} rx="3" />
          <text x={PL + i * bw + bw / 2} y={H - 6} textAnchor="middle">{d.label}</text>
        </g>
      ))}
    </svg>
  );
}

export function LineChart({ data, label, unit = '' }: { data: Pt[]; label: string; unit?: string }) {
  if (data.length === 0) return null;
  const vals = data.map((d) => d.value);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.15 || Math.max(1, hi * 0.1);
  const min = Math.max(0, lo - pad), max = hi + pad;
  const x = (i: number) => PL + (data.length === 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (data.length - 1));
  const y = (v: number) => PT + (H - PT - PB) * (1 - (v - min) / (max - min || 1));
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(' ');
  const step = Math.ceil(data.length / 6);
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${d.value}${unit}`).join(', ')}`}>
      {[0, 0.5, 1].map((f) => { const v = min + (max - min) * f; return <g key={f}><line className="grid" x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} /><text x={PL - 4} y={y(v) + 3} textAnchor="end">{fmt(v)}</text></g>; })}
      {data.length > 1 && <path className="area" d={`${path} L${x(data.length - 1)} ${H - PB} L${x(0)} ${H - PB} Z`} />}
      <path className="line" d={path} />
      {data.map((d, i) => <g key={i}><circle className="dotp" cx={x(i)} cy={y(d.value)} r="3.5" />{i % step === 0 && <text x={x(i)} y={H - 6} textAnchor="middle">{d.label}</text>}</g>)}
    </svg>
  );
}
