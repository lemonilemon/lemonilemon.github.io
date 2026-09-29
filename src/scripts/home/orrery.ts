// Night scene: the inner planets, drawn from wherever you stand. Choose a
// body and the view slides so it sits still at the centre while the others,
// the Sun included, trace their paths around it.
import type { Scene } from './scene';

// Where the orrery is drawn, in SVG units: the centre, pixels per AU, a size
// factor for the bodies, and the SVG's viewBox (used to place the buttons).
// The owner may change it (on resize) and then call redraw().
export interface OrreryFrame {
  cx: number;
  cy: number;
  scale: number;
  spark: number;
  view: { x: number; y: number; w: number; h: number };
}

type Name = 'sun' | 'venus' | 'earth' | 'mars';
const ORDER: Name[] = ['sun', 'venus', 'earth', 'mars'];
const BODIES: Record<Name, { a: number; ph: number }> = {
  sun: { a: 0, ph: 0 },
  venus: { a: 0.723, ph: 2.4 },
  earth: { a: 1, ph: 0.3 },
  mars: { a: 1.524, ph: 1.9 },
};
const YEARS_PER_SEC = 0.22;
const WINDOW = 5;
const STEP = 0.02;
const SEGS = 14;
const SVG = 'http://www.w3.org/2000/svg';
const r1 = (x: number) => Math.round(x * 10) / 10;

export class Orrery implements Scene {
  playing = true;
  private t = 0;
  private from: Name = 'earth';
  private to: Name = 'earth';
  private k = 1;
  private raf = 0;
  private prev = 0;
  private acc = 0;
  private trails = new Map<Name, SVGPathElement[]>();
  private bodies = new Map<Name, SVGPathElement>();
  private buttons = new Map<Name, HTMLButtonElement>();
  private halo: SVGCircleElement;

  constructor(
    root: HTMLElement,
    private frame: OrreryFrame,
  ) {
    const trailGroup = root.querySelector<SVGGElement>('[data-trails]')!;
    for (const n of ORDER) {
      this.trails.set(n, Array.from({ length: SEGS }, () => trailGroup.appendChild(document.createElementNS(SVG, 'path'))));
      this.bodies.set(n, root.querySelector<SVGPathElement>(`[data-body="${n}"]`)!);
      const button = root.querySelector<HTMLButtonElement>(`[data-stand="${n}"]`)!;
      // A pointer tap goes to the body nearest the tap, so bodies drawn
      // closer together than their 44px buttons stay reachable.
      button.addEventListener('click', (e) => this.standOn(e.detail > 0 ? this.nearest(e.clientX, e.clientY) : n));
      this.buttons.set(n, button);
    }
    this.halo = root.querySelector<SVGCircleElement>('[data-halo]')!;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.playing = false;
      this.t = 3.1;
    }
    this.draw();
  }

  private standOn(n: Name) {
    if (this.to === n || this.k < 1) return;
    this.from = this.to;
    this.to = n;
    this.k = 0;
    if (!this.raf) this.start();
  }

  private nearest(x: number, y: number): Name {
    let best: Name = this.to;
    let bd = Infinity;
    for (const [name, button] of this.buttons) {
      const rc = button.getBoundingClientRect();
      const d = Math.hypot(rc.left + rc.width / 2 - x, rc.top + rc.height / 2 - y);
      if (d < bd) {
        bd = d;
        best = name;
      }
    }
    return best;
  }

  private helio(n: Name, tau: number): [number, number] {
    const b = BODIES[n];
    if (!b.a) return [0, 0];
    const ang = b.ph + (2 * Math.PI * tau) / Math.pow(b.a, 1.5);
    const s = this.frame.scale;
    return [s * b.a * Math.cos(ang), -s * b.a * Math.sin(ang)];
  }

  private view(n: Name, tau: number): [number, number] {
    const k = this.k * this.k * (3 - 2 * this.k);
    const f = this.helio(this.from, tau);
    const g = this.helio(this.to, tau);
    const q = this.helio(n, tau);
    return [this.frame.cx + q[0] - (f[0] + (g[0] - f[0]) * k), this.frame.cy + q[1] - (f[1] + (g[1] - f[1]) * k)];
  }

  private draw() {
    const n = Math.round(WINDOW / STEP);
    for (const name of ORDER) {
      const paths = this.trails.get(name)!;
      if (this.k >= 1 && name === this.to) {
        for (const p of paths) p.setAttribute('d', '');
        continue;
      }
      const pts: string[] = [];
      for (let i = 0; i <= n; i++) {
        const q = this.view(name, this.t - WINDOW + i * STEP);
        pts.push(`${r1(q[0])} ${r1(q[1])}`);
      }
      for (let s = 0; s < SEGS; s++) {
        const a = Math.floor((s * n) / SEGS);
        const b = Math.floor(((s + 1) * n) / SEGS);
        const x = (s + 1) / SEGS;
        paths[s].setAttribute('d', `M${pts.slice(a, b + 1).join(' L')}`);
        paths[s].setAttribute('stroke-opacity', `${Math.round(x * x * 0.6 * 1000) / 1000}`);
      }
    }
    const sun = this.view('sun', this.t);
    this.halo.setAttribute('cx', `${r1(sun[0])}`);
    this.halo.setAttribute('cy', `${r1(sun[1])}`);
    for (const name of ORDER) {
      const [x, y] = this.view(name, this.t);
      const body = this.bodies.get(name)!;
      body.setAttribute('transform', `translate(${r1(x)} ${r1(y)}) scale(${r1(Number(body.dataset.scale) * this.frame.spark * 100) / 100})`);
      const { view } = this.frame;
      const button = this.buttons.get(name)!;
      button.style.left = `${((x - view.x) / view.w) * 100}%`;
      button.style.top = `${((y - view.y) / view.h) * 100}%`;
      const here = name === this.to;
      button.classList.toggle('here', here);
      button.setAttribute('aria-pressed', `${here}`);
    }
  }

  redraw() {
    this.draw();
  }

  start() {
    if (this.raf) return;
    this.prev = 0;
    this.acc = 0;
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      if (!this.prev) {
        this.prev = now;
        return;
      }
      this.acc += Math.min(0.1, (now - this.prev) / 1000);
      this.prev = now;
      if (this.acc < 0.033) return;
      const step = this.acc;
      this.acc = 0;
      const moving = this.k < 1;
      if (!this.playing && !moving) return;
      if (this.playing) this.t += step * YEARS_PER_SEC;
      if (moving) this.k = Math.min(1, this.k + step / 1.6);
      this.draw();
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
