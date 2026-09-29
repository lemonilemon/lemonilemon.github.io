// Static parts of the night scene on the 1280×800 design frame.
import { round, seeded } from '../../lib/random';

// Visible region of the design frame the orrery SVG shows.
export const VIEW = { x: 660, y: 60, w: 600, h: 600 };
export const ORRERY = { cx: 960, cy: 360, scale: 88 };

export const BODY_SCALE = { sun: 1.9, venus: 0.95, earth: 1.05, mars: 1 } as const;
export const BODY_LABEL = { sun: 'the Sun', venus: 'Venus', earth: 'Earth', mars: 'Mars' } as const;

// A four-pointed spark, used for the bodies and the brightest stars.
export const SPARK = 'M0 -5 C0.5 -1.3 1.3 -0.5 5 0 C1.3 0.5 0.5 1.3 0 5 C-0.5 1.3 -1.3 0.5 -5 0 C-1.3 -0.5 -0.5 -1.3 0 -5Z';

const rnd = seeded(7031);
export const dots: { x: number; y: number; r: number; o: number; cls: string }[] = [];
export const sparks: { tf: string; o: number; cls: string }[] = [];
for (let i = 0; i < 230; i++) {
  const x = Math.round(rnd() * 12800) / 10;
  const y = Math.round(rnd() * 8000) / 10;
  const mag = Math.pow(rnd(), 3);
  const cls = `t${Math.floor(rnd() * 8)}`;
  const o = round(0.18 + mag * 0.55, 2);
  if (mag >= 0.86) sparks.push({ tf: `translate(${x} ${y}) scale(${round(0.6 + (mag - 0.86) * 2.5, 2)})`, o, cls });
  else dots.push({ x, y, r: round(0.5 + mag * 1.3, 2), o, cls });
}
