// Zmiana kolejności elementów (przeciąganie i strzałki). Czysta logika.
export function moveItem<T>(arr: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= arr.length) return [...arr];
  const t = Math.max(0, Math.min(arr.length - 1, to));
  const n = [...arr]; const [x] = n.splice(from, 1); n.splice(t, 0, x); return n;
}

/** Indeks, na którym znajdzie się przeciągany element `from`, gdy jego środek jest na wysokości y (środki wierszy rosnąco).
 *  Liczy wiersze inne niż `from`, których środek leży powyżej y — przekroczenie środka sąsiada zamienia ich miejscami. */
export function dropIndex(mids: readonly number[], y: number, from = -1): number {
  let n = 0;
  for (let j = 0; j < mids.length; j++) if (j !== from && mids[j] < y) n++;
  return n;
}
