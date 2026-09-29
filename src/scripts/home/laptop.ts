// Static geometry of the day scene: a line-drawn laptop on the 1280×800
// design frame. Computed at build time; the browser only animates the screen.
import { round, seeded } from '../../lib/random';

export type KeyId = 'l' | 'r' | 't' | 'b' | 'zo' | 'zi';
type Point = [number, number];

// The laptop's bounds on the design frame (plus 1 for the stroke): the
// scene SVG shows exactly this region.
export const VIEW = { x: 659, y: 147, w: 582, h: 412 };
export const SCREEN = { x: 716, y: 164, w: 468, h: 278 };
export const CENTRE = { x: 950, y: 303 };

const points = (poly: Point[]) => poly.map(([x, y]) => `${round(x)},${round(y)}`).join(' ');

// Keyboard deck: a trapezoid from y 462 to 548. Its back edge is the lid's
// bottom edge (x 700–1200), the hinge; it widens by 40 on each side to the front.
const xl = (t: number) => 700 - 40 * t;
const xr = (t: number) => 1200 + 40 * t;
const yy = (t: number) => 462 + 86 * t;
const margin = 0.07;
const X = (t: number, u: number) => xl(t) + (xr(t) - xl(t)) * (margin + (1 - 2 * margin) * u);
function quad(t0: number, t1: number, u0: number, u1: number): Point[] {
  u0 += 0.0035;
  u1 -= 0.0035;
  return [[X(t0, u0), yy(t0)], [X(t0, u1), yy(t0)], [X(t1, u1), yy(t1)], [X(t1, u0), yy(t1)]];
}

const rows = [[0.06, 0.19], [0.21, 0.34], [0.36, 0.49], [0.51, 0.64]] as const;
const ids: Record<string, KeyId> = { '0:11': 'zo', '0:12': 'zi', '2:11': 't' };

interface Key {
  id: KeyId | null;
  row: number;
  q: Point[];
}
const keyQuads: Key[] = [];
for (let r = 0; r < 3; r++) {
  for (let k = 0; k < 13; k++) keyQuads.push({ id: ids[`${r}:${k}`] ?? null, row: r, q: quad(rows[r][0], rows[r][1], k / 13, (k + 1) / 13) });
}
const [b0, b1] = rows[3];
for (let k = 0; k < 5; k++) keyQuads.push({ id: null, row: 3, q: quad(b0, b1, k / 13, (k + 1) / 13) });
keyQuads.push({ id: null, row: 3, q: quad(b0, b1, 5 / 13, 10 / 13) });
keyQuads.push({ id: 'l', row: 3, q: quad(b0, b1, 10 / 13, 11 / 13) });
keyQuads.push({ id: 'b', row: 3, q: quad(b0, b1, 11 / 13, 12 / 13) });
keyQuads.push({ id: 'r', row: 3, q: quad(b0, b1, 12 / 13, 13 / 13) });

export const keys = keyQuads.map((k) => ({ id: k.id, pts: points(k.q) }));
export const trackpad = points(quad(0.7, 0.93, 0.36, 0.64));

const labels: Record<KeyId, string> = { zo: 'Zoom out', zi: 'Zoom in', t: 'Engine forward', b: 'Engine backward', l: 'Turn left', r: 'Turn right' };
const rowY = rows.map(([a, b]) => [yy(a), yy(b)]);

export const glyphs: { id: KeyId; pts: string }[] = [];
export const pads: { id: KeyId; label: string; x: number; y: number; w: number; h: number }[] = [];
for (const k of keyQuads) {
  if (!k.id) continue;
  const xs = k.q.map((p) => p[0]);
  const ys = k.q.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const cx = (x0 + x1) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const g: Point[][] = [];
  if (k.id === 'l') g.push([[cx - 3, cy], [cx + 2, cy - 2.6], [cx + 2, cy + 2.6]]);
  if (k.id === 'r') g.push([[cx + 3, cy], [cx - 2, cy - 2.6], [cx - 2, cy + 2.6]]);
  if (k.id === 't') g.push([[cx, cy - 2.8], [cx - 2.8, cy + 2], [cx + 2.8, cy + 2]]);
  if (k.id === 'b') g.push([[cx, cy + 2.8], [cx - 2.8, cy - 2], [cx + 2.8, cy - 2]]);
  if (k.id === 'zo' || k.id === 'zi') g.push([[cx - 3, cy - 0.6], [cx + 3, cy - 0.6], [cx + 3, cy + 0.6], [cx - 3, cy + 0.6]]);
  if (k.id === 'zi') g.push([[cx - 0.6, cy - 3], [cx + 0.6, cy - 3], [cx + 0.6, cy + 3], [cx - 0.6, cy + 3]]);
  for (const poly of g) glyphs.push({ id: k.id, pts: points(poly) });
  const top = k.row === 0 ? rowY[0][0] - 12 : (rowY[k.row - 1][1] + rowY[k.row][0]) / 2;
  const bottom = k.row === 3 ? rowY[3][1] + 14 : (rowY[k.row][1] + rowY[k.row + 1][0]) / 2;
  pads.push({ id: k.id, label: labels[k.id], x: Math.round(x0), y: Math.round(top), w: Math.round(x1 - x0), h: Math.round(bottom - top) });
}

// Faint stars on the screen.
const rnd = seeded(1969);
export const specks = Array.from({ length: 52 }, () => {
  const m = Math.pow(rnd(), 2);
  return {
    x: round(SCREEN.x + rnd() * SCREEN.w),
    y: round(SCREEN.y + rnd() * SCREEN.h),
    r: round(0.5 + m * 0.9, 2),
    o: round(0.16 + m * 0.36, 2),
    cls: `t${Math.floor(rnd() * 4)}`,
  };
});
