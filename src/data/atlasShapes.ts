// Kształty atlasu mięśni (SVG, układ 200×400, rysowana prawa połowa; lewa to odbicie względem x=100).
// Oddzielenie geometrii od logiki: do przyszłego widoku 3D wystarczy podmienić warstwę renderującą (Atlas.tsx),
// a identyfikatory MuscleId i powiązania z ćwiczeniami pozostają bez zmian.
import type { MuscleId } from '../core/types';

export type AtlasView = 'front' | 'back';
type Shapes = Partial<Record<MuscleId, string[]>>;

export const FRONT: Shapes = {
  neck: ['M100 48 L108 50 L111 64 L100 69 Z'],
  traps: ['M111 64 L128 70 L140 78 L125 78 L110 71 Z'],
  front_delts: ['M127 74 C142 72 154 82 156 98 L144 102 C140 92 134 84 126 80 Z'],
  side_delts: ['M156 98 C160 106 160 116 156 124 L146 120 L144 102 Z'],
  chest: ['M102 72 L126 80 C136 92 138 106 128 116 C118 120 108 118 102 114 Z'],
  biceps: ['M146 124 L158 126 L156 156 L145 158 L143 136 Z'],
  forearms: ['M144 162 L156 160 L161 206 L150 212 L145 192 Z'],
  abs: ['M102 120 L116 120 L116 170 L102 174 Z'],
  obliques: ['M118 120 L130 118 L130 164 L118 168 Z'],
  hip_flexors: ['M104 178 L122 172 L126 192 L104 194 Z'],
  adductors: ['M100 196 L110 196 L108 250 L112 286 L100 272 Z'],
  quads: ['M112 196 L130 192 L134 250 L128 292 L114 290 L110 250 Z'],
  calves: ['M112 300 L128 300 L128 350 L122 382 L114 382 L110 340 Z'],
};

export const BACK: Shapes = {
  neck: ['M100 48 L108 50 L111 62 L100 66 Z'],
  traps: ['M100 58 L112 62 L132 76 L122 98 L100 126 Z'],
  rear_delts: ['M130 76 C144 74 154 84 156 98 L146 104 C140 94 134 86 128 82 Z'],
  side_delts: ['M156 98 C160 106 160 116 156 124 L146 120 L146 104 Z'],
  mid_back: ['M102 98 L120 96 L122 114 L102 126 Z'],
  lats: ['M124 100 L138 100 C142 122 134 146 120 156 L104 152 L104 132 L124 118 Z'],
  triceps: ['M146 124 L158 126 L156 156 L145 158 L143 136 Z'],
  forearms: ['M144 162 L156 160 L161 206 L150 212 L145 192 Z'],
  lower_back: ['M102 132 L118 138 L116 166 L102 170 Z'],
  glutes: ['M102 172 L128 170 C137 182 135 202 124 210 L102 212 Z'],
  hamstrings: ['M104 216 L126 214 L130 262 L126 294 L110 294 L104 262 Z'],
  calves: ['M110 300 L128 300 C132 322 128 348 122 370 L114 370 C108 348 106 322 110 300 Z'],
};

/** Zarys sylwetki (prawa połowa, odbijana). */
export const SILHOUETTE: string[] = [
  'M100 60 L134 66 L148 80 L138 132 L134 172 L138 198 L100 202 Z', // tułów
  'M143 80 L164 102 L163 156 L166 212 L148 218 L140 158 L140 104 Z', // ramię
  'M100 194 L138 194 L138 252 L136 302 L131 386 L110 388 L108 302 L100 252 Z', // noga
];
