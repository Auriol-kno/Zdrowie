import { useRef, useState } from 'react';
import { dropIndex } from '../engine/reorder';

interface Drag { from: number; to: number; dy: number; mids: number[]; startY: number; h: number }

/** Przeciąganie wierszy listy w pionie (mysz, dotyk, pióro). Strzałki w interfejsie zostają jako alternatywa dla klawiatury. */
export function useDragList(onMove: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const rows = useRef<(any)[]>([]);

  const down = (i: number) => (e: any) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const rects = rows.current.map((el) => el?.getBoundingClientRect());
    const mids = rects.map((r: any) => (r ? r.top + r.height / 2 : 0));
    setDrag({ from: i, to: i, dy: 0, mids, startY: e.clientY, h: (rects[i]?.height ?? 56) + 8 });
  };
  const move = (e: any) => {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    setDrag({ ...drag, dy, to: dropIndex(drag.mids, drag.mids[drag.from] + dy, drag.from) });
    // przewijanie przy krawędzi ekranu
    const vh = window.innerHeight;
    if (e.clientY < 90) window.scrollBy(0, -14); else if (e.clientY > vh - 110) window.scrollBy(0, 14);
    const sc = rows.current[drag.from]?.closest?.('.main');
    if (sc) { if (e.clientY < 110) sc.scrollTop -= 14; else if (e.clientY > vh - 130) sc.scrollTop += 14; }
  };
  const end = (e: any) => {
    if (!drag) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const { from, to } = drag; setDrag(null);
    if (from !== to) onMove(from, to);
  };

  const row = (i: number) => {
    let y = 0; let cls = 'dragrow';
    if (drag) {
      if (i === drag.from) { y = drag.dy; cls += ' dragging'; }
      else if (drag.from < drag.to && i > drag.from && i <= drag.to) y = -drag.h;
      else if (drag.from > drag.to && i >= drag.to && i < drag.from) y = drag.h;
    }
    return { ref: (el: any) => { rows.current[i] = el; }, className: cls, style: { transform: y ? `translateY(${y}px)` : undefined } as Record<string, string | undefined> };
  };
  const handle = (i: number) => ({ onPointerDown: down(i), onPointerMove: move, onPointerUp: end, onPointerCancel: end, style: { touchAction: 'none', cursor: drag ? 'grabbing' : 'grab' } as Record<string, string> });
  return { row, handle, dragging: drag?.from ?? null };
}
