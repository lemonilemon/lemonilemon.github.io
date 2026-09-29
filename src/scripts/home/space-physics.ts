// The physics of the day scene's Space Travel, kept free of the DOM so it can
// be tested on its own. Units are arbitrary: the Sun sits at the origin and
// Earth's orbit has radius 100. Gravity is "patched": inside a planet's
// sphere of influence (soi) only that planet pulls, elsewhere only the Sun.

export type Name = 'sun' | 'venus' | 'earth' | 'mars';
export const NAMES: Name[] = ['sun', 'venus', 'earth', 'mars'];
export const PLANETS: Exclude<Name, 'sun'>[] = ['venus', 'earth', 'mars'];

export interface BodyDef {
  label: string;
  a: number; // orbit radius
  R: number; // surface radius
  GM: number;
  ph: number; // orbit phase at time 0
  soi: number;
  w: number; // angular speed
}

const SUN_GM = 24674;
const body = (label: string, a: number, R: number, GM: number, ph: number, soi: number): BodyDef => ({
  label, a, R, GM, ph, soi, w: a ? Math.sqrt(SUN_GM / a ** 3) : 0,
});

export const BODIES: Record<Name, BodyDef> = {
  sun: body('SUN', 0, 9, SUN_GM, 0, Infinity),
  venus: body('VENUS', 70, 3.8, 45, 2.2, 24),
  earth: body('EARTH', 100, 4.2, 55, 0.4, 22),
  mars: body('MARS', 150, 3.2, 32, 1.3, 24),
};

export const THRUST = 6;
export const REVERSE = 0.6; // reverse thrust as a share of THRUST
export const LOST = 240; // distance from the Sun at which the ship is lost
// Touching down faster than this, straight down or in total, is a crash.
export const CRASH_RADIAL = 4.5;
export const CRASH_TOTAL = 7;

export interface Vec {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function bodyAt(n: Name, tau: number): Vec {
  const b = BODIES[n];
  if (!b.a) return { x: 0, y: 0, vx: 0, vy: 0 };
  const an = b.ph + b.w * tau;
  const c = Math.cos(an);
  const s = Math.sin(an);
  return { x: b.a * c, y: b.a * s, vx: -b.a * b.w * s, vy: b.a * b.w * c };
}

// The body whose gravity applies at (x, y): the nearest planet whose soi
// contains the point, else the Sun.
export function dominant(x: number, y: number, tau: number): Name {
  let best: Name = 'sun';
  let bd = Infinity;
  for (const n of PLANETS) {
    const p = bodyAt(n, tau);
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < BODIES[n].soi && d < bd) {
      bd = d;
      best = n;
    }
  }
  return best;
}

export type Outcome = { kind: 'flying' } | { kind: 'landed'; n: Name; a: number } | { kind: 'crashed'; n: Name } | { kind: 'lost' };

// Advance a free-flying ship by h. `ax`/`ay` is the thrust acceleration.
// Integrates in the dominant body's frame with leapfrog (kick, drift, kick),
// which stays accurate at the coarse steps the prediction uses, then checks
// for touching a surface or leaving the system.
export function advance(s: Vec, tau: number, h: number, ax = 0, ay = 0): Outcome {
  const ref = dominant(s.x, s.y, tau);
  const GM = BODIES[ref].GM;
  const rb = bodyAt(ref, tau);
  let rx = s.x - rb.x;
  let ry = s.y - rb.y;
  let rvx = s.vx - rb.vx;
  let rvy = s.vy - rb.vy;
  const pull = (x: number, y: number) => {
    const r2 = x * x + y * y + 0.01;
    return GM / (r2 * Math.sqrt(r2));
  };
  let k = pull(rx, ry);
  rvx += (ax - rx * k) * (h / 2);
  rvy += (ay - ry * k) * (h / 2);
  rx += rvx * h;
  ry += rvy * h;
  k = pull(rx, ry);
  rvx += (ax - rx * k) * (h / 2);
  rvy += (ay - ry * k) * (h / 2);
  const nb = bodyAt(ref, tau + h);
  s.x = nb.x + rx;
  s.y = nb.y + ry;
  s.vx = nb.vx + rvx;
  s.vy = nb.vy + rvy;
  return touchdown(s, tau + h);
}

export function touchdown(s: Vec, tau: number): Outcome {
  for (const n of NAMES) {
    const p = bodyAt(n, tau);
    const dx = s.x - p.x;
    const dy = s.y - p.y;
    const R = BODIES[n].R;
    if (dx * dx + dy * dy >= R * R) continue;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const rvx = s.vx - p.vx;
    const rvy = s.vy - p.vy;
    const radial = -(rvx * dx + rvy * dy) / d;
    if (n === 'sun' || radial > CRASH_RADIAL || Math.hypot(rvx, rvy) > CRASH_TOTAL) return { kind: 'crashed', n };
    return { kind: 'landed', n, a: Math.atan2(dy, dx) };
  }
  if (Math.hypot(s.x, s.y) > LOST) return { kind: 'lost' };
  return { kind: 'flying' };
}

// Step size for a ship at (x, y): fine near a planet, coarse around the Sun.
export function stepFor(x: number, y: number, tau: number): number {
  const ref = dominant(x, y, tau);
  if (ref === 'sun') return 0.05;
  const p = bodyAt(ref, tau);
  const r = Math.hypot(x - p.x, y - p.y);
  return Math.min(0.02, Math.max(0.004, r / 600));
}

export interface Prediction {
  // Sampled positions with their times, for drawing.
  pts: { x: number; y: number; tau: number }[];
  end: Outcome;
  // For each other planet, the closest the predicted path comes to it.
  near: Partial<Record<Name, { d: number; tau: number }>>;
}

// Where the ship will go if it coasts from now, for up to `span` of time.
// With `within`, the path stops where it leaves that planet's soi.
export function predict(ship: Vec, tau: number, span: number, within?: Name, maxSteps = 4000): Prediction {
  const s = { ...ship };
  const pts = [{ x: s.x, y: s.y, tau }];
  const near: Prediction['near'] = {};
  let t = tau;
  let end: Outcome = { kind: 'flying' };
  let sinceSample = 0;
  for (let i = 0; i < maxSteps && t < tau + span; i++) {
    const h = stepFor(s.x, s.y, t);
    end = advance(s, t, h);
    t += h;
    sinceSample += h;
    for (const n of PLANETS) {
      const p = bodyAt(n, t);
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (!near[n] || d < near[n].d) near[n] = { d, tau: t };
    }
    const ref = dominant(s.x, s.y, t);
    if (end.kind !== 'flying' || (within && ref !== within)) {
      pts.push({ x: s.x, y: s.y, tau: t });
      break;
    }
    if (sinceSample >= (ref === 'sun' ? 0.25 : 0.04)) {
      sinceSample = 0;
      pts.push({ x: s.x, y: s.y, tau: t });
    }
  }
  return { pts, end, near };
}
