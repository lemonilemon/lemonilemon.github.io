// Day scene: a small Space Travel on a screen (the laptop's on wide
// layouts, the phone's own on narrow ones). Fly from Earth, land gently on
// Venus and Mars. Nothing moves until someone touches it.
//
// What keeps it playable: a dotted line shows where the ship will coast to,
// with a ghost of any planet it will meet; time runs faster while coasting
// between planets; the camera follows whichever body's gravity holds the
// ship and zooms to fit; and steering runs in real time.
import type { KeyId } from './laptop';
import type { Scene } from './scene';
import { BODIES, PLANETS, THRUST, REVERSE, advance, bodyAt, dominant, predict, type Name, type Prediction, type Vec } from './space-physics';

// The screen the game is drawn on, in SVG units: its centre and size.
// The owner may change it (on resize) and then call redraw().
export interface ScreenFrame {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

interface Ship extends Vec {
  th: number;
  landed: { n: Name; a: number } | null;
  dead: number;
  lost: boolean;
  trail: [number, number][];
  ref: Name;
  sample: number;
  fwd: boolean;
  back: boolean;
}

const STEP = 1 / 240; // simulation step
const PACE = 0.8; // simulation time per real second
const WARP = 4; // pace multiplier while coasting around the Sun
const WARP_NEAR = 2; // ...and while coasting high above a planet
const SLOW = 0.6; // pace multiplier close to a planet's surface, for landing
const LOW = 12; // altitude below which a planet's surface counts as close
const TURN = 3.2; // radians per real second, arrow keys
const AIM = 9; // radians per real second, turning towards a held pointer
const EGG_SECONDS = 8;
const NEAR_MISS = 60; // show a planet's ghost when the path passes this close
const SVG = 'http://www.w3.org/2000/svg';
const r1 = (x: number) => Math.round(x * 10) / 10;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export class SpaceTravel implements Scene {
  private live = true;
  private tau = 0;
  private pace = PACE;
  private started = false;
  private inp = { l: false, r: false, t: false, b: false, p: null as [number, number] | null };
  private visited: Partial<Record<Name, boolean>> = {};
  private egg = 0;
  private eggDone = false;
  private ship!: Ship;
  // The camera follows a body, with an offset that eases to zero after a
  // switch, and zooms on a log scale towards a fitted target.
  private cam = { n: 'earth' as Name, ox: 0, oy: 0, logS: 0, bias: 0 };
  private plan: Prediction | null = null;
  private raf = 0;
  private prev = 0;
  private acc = 0;
  private drawAcc = 0;
  private dirty = true;

  private el: {
    orbits: SVGCircleElement[];
    trail: SVGPathElement[];
    path: SVGPathElement;
    crash: SVGPathElement;
    ghosts: SVGCircleElement[];
    halo: SVGCircleElement;
    sun: SVGPathElement;
    planets: SVGCircleElement[];
    labels: SVGTextElement[];
    ship: SVGGElement;
    fwd: SVGPathElement;
    back: SVGPathElement;
    boom: SVGPathElement;
    hud: SVGTextElement;
    zoom: SVGTextElement;
    egg: SVGGElement;
    paused: SVGGElement;
    screen: HTMLButtonElement;
    keys: Map<string, SVGElement[]>;
  };
  private label: string;

  constructor(
    private root: HTMLElement,
    private frame: ScreenFrame,
  ) {
    this.spawn();
    this.cam.logS = Math.log(this.targetScale());
    const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
    const trailGroup = q<SVGGElement>('[data-trail]');
    const trail = Array.from({ length: 8 }, () => trailGroup.appendChild(document.createElementNS(SVG, 'path')));
    const keys = new Map<string, SVGElement[]>();
    root.querySelectorAll<SVGElement>('[data-key], [data-glyph]').forEach((node) => {
      const id = node.dataset.key ?? node.dataset.glyph!;
      keys.set(id, [...(keys.get(id) ?? []), node]);
    });
    this.el = {
      orbits: [...root.querySelectorAll<SVGCircleElement>('[data-orbit]')],
      trail,
      path: q('[data-path]'),
      crash: q('[data-path-crash]'),
      ghosts: [...root.querySelectorAll<SVGCircleElement>('[data-ghost]')],
      halo: q('[data-sun-halo]'),
      sun: q('[data-sun]'),
      planets: [...root.querySelectorAll<SVGCircleElement>('[data-planet]')],
      labels: [...root.querySelectorAll<SVGTextElement>('[data-label]')],
      ship: q('[data-ship]'),
      fwd: q('[data-fwd]'),
      back: q('[data-back]'),
      boom: q('[data-boom]'),
      hud: q('[data-hud]'),
      zoom: q('[data-zoom]'),
      egg: q('[data-egg]'),
      paused: q('[data-paused]'),
      screen: q('[data-screen]'),
      keys,
    };
    this.label = this.el.screen.getAttribute('aria-label') ?? '';
    this.bindInput();
    this.draw();
  }

  get playing() {
    return this.live;
  }

  set playing(value: boolean) {
    this.live = value;
    this.dirty = true;
  }

  // Ask the page to pause or resume, so every play button stays in step.
  private togglePlay() {
    this.root.dispatchEvent(new CustomEvent('playtoggle', { bubbles: true }));
  }

  // --- simulation ---

  private spawn() {
    const e = bodyAt('earth', this.tau);
    const a = -Math.PI / 2;
    const R = BODIES.earth.R + 0.05;
    this.ship = {
      x: e.x + R * Math.cos(a), y: e.y + R * Math.sin(a), vx: e.vx, vy: e.vy,
      th: a, landed: { n: 'earth', a }, dead: 0, lost: false, trail: [], ref: 'earth', sample: 0, fwd: false, back: false,
    };
  }

  private thrusting() {
    return this.ship.fwd || this.ship.back;
  }

  // Turning and aiming run in real time, whatever the simulation's pace.
  private steer(dt: number) {
    const s = this.ship;
    const inp = this.inp;
    if (inp.l) s.th -= TURN * dt;
    if (inp.r) s.th += TURN * dt;
    let fwd = inp.t;
    if (inp.p !== null && !s.dead) {
      const cam = this.camPos();
      const S = Math.exp(this.cam.logS);
      const d = wrap(Math.atan2(cam.y + inp.p[1] / S - s.y, cam.x + inp.p[0] / S - s.x) - s.th);
      s.th += Math.max(-AIM * dt, Math.min(AIM * dt, d));
      if (Math.abs(d) < 0.5) fwd = true;
    }
    s.fwd = fwd && !s.dead;
    s.back = inp.b && !s.dead;
  }

  private step(h: number) {
    const s = this.ship;
    this.tau += h;
    if (s.dead > 0) {
      s.dead -= h;
      if (s.dead <= 0) this.spawn();
      return;
    }
    if (s.landed) {
      const lb = bodyAt(s.landed.n, this.tau);
      const R = BODIES[s.landed.n].R + 0.05;
      Object.assign(s, { x: lb.x + R * Math.cos(s.landed.a), y: lb.y + R * Math.sin(s.landed.a), vx: lb.vx, vy: lb.vy });
      if (s.fwd) {
        s.landed = null;
        s.vx += Math.cos(s.th) * 0.5;
        s.vy += Math.sin(s.th) * 0.5;
      }
      return;
    }
    const push = (s.fwd ? THRUST : 0) - (s.back ? THRUST * REVERSE : 0);
    const out = advance(s, this.tau - h, h, push * Math.cos(s.th), push * Math.sin(s.th));
    if (out.kind === 'crashed' || out.kind === 'lost') {
      s.dead = 1.4;
      s.lost = out.kind === 'lost';
      s.trail = [];
      return;
    }
    if (out.kind === 'landed') {
      s.landed = { n: out.n, a: out.a };
      s.trail = [];
      this.visited[out.n] = true;
      if (!this.eggDone && this.visited.venus && this.visited.mars) {
        this.eggDone = true;
        this.egg = EGG_SECONDS;
      }
      return;
    }
    const ref = dominant(s.x, s.y, this.tau);
    const rb = bodyAt(ref, this.tau);
    if (ref !== s.ref) {
      s.ref = ref;
      s.trail = [];
    }
    s.sample += h;
    if (s.sample >= (ref === 'sun' ? 0.2 : 1 / 15)) {
      s.sample = 0;
      s.trail.push([s.x - rb.x, s.y - rb.y]);
      if (s.trail.length > 150) s.trail.shift();
    }
  }

  // --- camera ---

  private focus(): Name {
    const s = this.ship;
    if (s.landed) return s.landed.n;
    return dominant(s.x, s.y, this.tau);
  }

  // Around the Sun, fit the ship's distance from it, never tighter than
  // Venus's orbit. Near a planet, fit its soi; but while descending, fit the
  // ship's distance instead, so the surface grows for the landing (never
  // tighter than 2.6 radii). Then the viewer's zoom steps.
  private targetScale() {
    const half = Math.min(this.frame.w, this.frame.h) / 2 - 16;
    const s = this.ship;
    const n = this.focus();
    let reach: number;
    if (n === 'sun') reach = Math.max(1.15 * Math.hypot(s.x, s.y), 85);
    else {
      reach = BODIES[n].soi;
      const b = bodyAt(n, this.tau);
      const dx = s.x - b.x;
      const dy = s.y - b.y;
      const dist = Math.hypot(dx, dy);
      const descending = !s.landed && !s.dead && (dx * (s.vx - b.vx) + dy * (s.vy - b.vy)) / dist < -0.3;
      if (descending) reach = Math.min(reach, Math.max(1.5 * dist, 2.6 * BODIES[n].R));
    }
    return Math.max(half, 40) / reach * 2 ** this.cam.bias;
  }

  private camPos() {
    const b = bodyAt(this.cam.n, this.tau);
    return { x: b.x + this.cam.ox, y: b.y + this.cam.oy };
  }

  private follow(dt: number) {
    const c = this.cam;
    const n = this.focus();
    if (n !== c.n) {
      const old = this.camPos();
      const nb = bodyAt(n, this.tau);
      c.n = n;
      c.ox = old.x - nb.x;
      c.oy = old.y - nb.y;
      c.bias = 0;
    }
    const k = 1 - Math.exp(-dt / 0.45);
    c.ox -= c.ox * k;
    c.oy -= c.oy * k;
    c.logS += (Math.log(this.targetScale()) - c.logS) * k;
  }

  private zoom(d: number) {
    this.cam.bias = Math.max(-2, Math.min(2, this.cam.bias + d));
    this.dirty = true;
  }

  // --- drawing ---

  private draw() {
    const s = this.ship;
    const el = this.el;
    const S = Math.exp(this.cam.logS);
    const cam = this.camPos();
    const { cx, cy } = this.frame;
    const toScr = (x: number, y: number): [number, number] => [cx + S * (x - cam.x), cy + S * (y - cam.y)];
    const dead = s.dead > 0;
    const sp = toScr(s.x, s.y);
    const attr = (node: Element, values: Record<string, string | number>) => {
      for (const [k, v] of Object.entries(values)) node.setAttribute(k, `${v}`);
    };

    const live = this.playing;
    const on: Record<KeyId, boolean> = { l: live && this.inp.l, r: live && this.inp.r, t: live && s.fwd, b: live && s.back, zo: false, zi: false };
    for (const [id, nodes] of el.keys) for (const node of nodes) node.toggleAttribute('data-on', on[id as KeyId]);

    const sun = toScr(0, 0);
    PLANETS.forEach((n, i) => attr(el.orbits[i], { cx: r1(sun[0]), cy: r1(sun[1]), r: r1(BODIES[n].a * S) }));
    attr(el.halo, { cx: r1(sun[0]), cy: r1(sun[1]), r: r1(Math.max(3, BODIES.sun.R * S)) });
    attr(el.sun, { transform: `translate(${r1(sun[0])} ${r1(sun[1])}) scale(${r1(Math.max(0.7, (BODIES.sun.R * S) / 6))})` });
    attr(el.labels[0], { x: r1(sun[0] + Math.max(6, BODIES.sun.R * S) + 4), y: r1(sun[1] - 4) });
    PLANETS.forEach((n, i) => {
      const b = bodyAt(n, this.tau);
      const [x, y] = toScr(b.x, b.y);
      const r = r1(Math.max(1.6, BODIES[n].R * S));
      attr(el.planets[i], { cx: r1(x), cy: r1(y), r });
      attr(el.labels[i + 1], { x: r1(x + r + 4), y: r1(y - r - 2) });
    });

    // The trail, drawn relative to the body it was recorded against.
    const tr = s.trail;
    const segs = el.trail.length;
    if (tr.length > 2 && !dead) {
      const rb = bodyAt(s.ref, this.tau);
      const pts = tr.map((p) => toScr(rb.x + p[0], rb.y + p[1]));
      pts.push(sp);
      const n = pts.length;
      for (let k = 0; k < segs; k++) {
        const a = Math.floor((k * (n - 1)) / segs);
        const b = Math.floor(((k + 1) * (n - 1)) / segs);
        let d = '';
        if (b > a) {
          d = `M${r1(pts[a][0])} ${r1(pts[a][1])}`;
          for (let i = a + 1; i <= b; i++) d += ` L${r1(pts[i][0])} ${r1(pts[i][1])}`;
        }
        attr(el.trail[k], { d, 'stroke-opacity': Math.round(((k + 1) / segs) ** 2 * 0.7 * 1000) / 1000 });
      }
    } else {
      for (const p of el.trail) p.setAttribute('d', '');
    }

    // Where the ship will coast to, in the camera's frame: a point predicted
    // for time t is drawn relative to where the followed body will be then.
    const plan = !dead && !s.landed ? this.plan : null;
    let pathD = '';
    let crashAt: [number, number] | null = null;
    const ghostAt: ([number, number] | null)[] = PLANETS.map(() => null);
    if (plan) {
      const now = bodyAt(this.cam.n, this.tau);
      const rel = (x: number, y: number, t: number): [number, number] => {
        const b = bodyAt(this.cam.n, t);
        return toScr(x - b.x + now.x, y - b.y + now.y);
      };
      pathD = plan.pts.map((p, i) => {
        const [x, y] = rel(p.x, p.y, p.tau);
        return `${i ? 'L' : 'M'}${r1(x)} ${r1(y)}`;
      }).join(' ');
      if (plan.end.kind === 'crashed') {
        const last = plan.pts[plan.pts.length - 1];
        crashAt = rel(last.x, last.y, last.tau);
      }
      // A ghost of each planet the path meets or nearly meets, where that
      // planet will be at the closest point: strong for a meeting, faint
      // for a near miss, so the player can see how far off the aim is.
      PLANETS.forEach((n, i) => {
        const near = plan.near[n];
        if (!near || n === this.cam.n || near.d > NEAR_MISS) return;
        const b = bodyAt(n, near.tau);
        ghostAt[i] = rel(b.x, b.y, near.tau);
        el.ghosts[i].setAttribute('stroke-opacity', near.d <= BODIES[n].soi ? '0.7' : '0.3');
      });
    }
    el.path.setAttribute('d', pathD);
    el.crash.style.display = crashAt ? '' : 'none';
    if (crashAt) el.crash.setAttribute('transform', `translate(${r1(crashAt[0])} ${r1(crashAt[1])})`);
    PLANETS.forEach((n, i) => {
      const g = ghostAt[i];
      el.ghosts[i].style.display = g ? '' : 'none';
      if (g) attr(el.ghosts[i], { cx: r1(g[0]), cy: r1(g[1]), r: r1(Math.max(4, BODIES[n].R * S + 3)) });
    });

    el.ship.style.display = dead ? 'none' : '';
    el.boom.style.display = dead ? '' : 'none';
    el.fwd.style.display = s.fwd ? '' : 'none';
    el.back.style.display = s.back ? '' : 'none';
    const deg = Math.round(((((s.th * 180) / Math.PI + 90) % 360) + 360) % 360 * 10) / 10;
    el.ship.setAttribute('transform', `translate(${r1(sp[0])} ${r1(sp[1])}) rotate(${deg})`);
    el.boom.setAttribute('transform', `translate(${r1(sp[0])} ${r1(sp[1])})`);

    let hud: string;
    if (dead) hud = s.lost ? 'LOST IN SPACE' : 'CRASHED';
    else if (s.landed) hud = `LANDED · ${BODIES[s.landed.n].label}`;
    else {
      const n = dominant(s.x, s.y, this.tau);
      const b = bodyAt(n, this.tau);
      const alt = Math.hypot(s.x - b.x, s.y - b.y) - BODIES[n].R;
      const v = Math.hypot(s.vx - b.vx, s.vy - b.vy);
      const rate = this.pace / PACE;
      const time = rate > 1.5 ? `  TIME ×${Math.round(rate)}` : rate < 0.8 ? `  TIME ×${rate.toFixed(1)}` : '';
      hud = `${BODIES[n].label}  ALT ${alt.toFixed(1)}  V ${v.toFixed(1)}${time}`;
    }
    el.hud.textContent = hud;
    el.zoom.textContent = `×${S.toFixed(1)}`;
    el.egg.style.display = this.egg > 0 ? '' : 'none';
    el.paused.style.display = this.live ? 'none' : '';
    el.screen.setAttribute('aria-label', this.live ? this.label : 'Space Travel, paused. Press to resume.');
    this.dirty = false;
  }

  // --- input ---

  private pointerOffset(e: PointerEvent): [number, number] {
    const rc = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return [((e.clientX - rc.left) / rc.width - 0.5) * this.frame.w, ((e.clientY - rc.top) / rc.height - 0.5) * this.frame.h];
  }

  private bindInput() {
    const screen = this.root.querySelector<HTMLButtonElement>('[data-screen]')!;
    const capture = (e: PointerEvent) => {
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // Capture is best effort.
      }
    };
    screen.addEventListener('pointerdown', (e) => {
      // A press on the paused screen resumes, without steering.
      if (!this.live) {
        this.togglePlay();
        return;
      }
      capture(e);
      this.started = true;
      this.inp.p = this.pointerOffset(e);
      this.dirty = true;
    });
    screen.addEventListener('pointermove', (e) => {
      if (this.inp.p !== null) this.inp.p = this.pointerOffset(e);
    });
    const release = () => {
      this.inp.p = null;
      this.dirty = true;
    };
    screen.addEventListener('pointerup', release);
    screen.addEventListener('pointercancel', release);

    const keyMap: Record<string, 'l' | 'r' | 't' | 'b'> = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 't', ArrowDown: 'b' };
    screen.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        this.togglePlay();
        return;
      }
      const id = keyMap[e.key];
      if (id) {
        e.preventDefault();
        this.started = true;
        this.inp[id] = true;
        this.dirty = true;
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        this.zoom(-1);
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        this.zoom(1);
      }
    });
    screen.addEventListener('keyup', (e) => {
      const id = keyMap[e.key];
      if (id) {
        this.inp[id] = false;
        this.dirty = true;
      }
    });
    screen.addEventListener('blur', () => {
      this.inp.l = this.inp.r = this.inp.t = this.inp.b = false;
      this.dirty = true;
    });

    this.root.querySelectorAll<HTMLButtonElement>('[data-pad]').forEach((pad) => {
      const id = pad.dataset.pad as KeyId;
      const tap = id === 'zo' || id === 'zi';
      pad.addEventListener('pointerdown', (e) => {
        capture(e);
        if (tap) {
          this.zoom(id === 'zi' ? 1 : -1);
          return;
        }
        this.started = true;
        this.inp[id as 'l' | 'r' | 't' | 'b'] = true;
        this.dirty = true;
      });
      const up = () => {
        if (!tap && this.inp[id as 'l' | 'r' | 't' | 'b']) {
          this.inp[id as 'l' | 'r' | 't' | 'b'] = false;
          this.dirty = true;
        }
      };
      pad.addEventListener('pointerup', up);
      pad.addEventListener('pointerleave', up);
      pad.addEventListener('pointercancel', up);
    });

    // On-screen zoom keys (phone layout).
    this.root.querySelectorAll<HTMLButtonElement>('[data-zoom-step]').forEach((key) => {
      key.addEventListener('click', () => this.zoom(Number(key.dataset.zoomStep)));
    });
  }

  // Call after the frame changes size: the zoom jumps to fit instead of
  // easing, since there is nothing on screen to ease from.
  redraw() {
    this.cam.logS = Math.log(this.targetScale());
    this.dirty = true;
    if (!this.raf) this.draw();
  }

  // --- loop ---

  private tick(dt: number) {
    const i = this.inp;
    // Paused means frozen: input waits until play resumes. Zooming still
    // works, since it only moves the camera.
    const running = this.started && this.playing;
    if (running) {
      this.steer(dt);
      // Warp while coasting: fast around the Sun, less so high above a
      // planet. Slow down when descending close to a surface, so there is
      // time to land (but not on the way up).
      const s = this.ship;
      const ref = dominant(s.x, s.y, this.tau);
      const rb = bodyAt(ref, this.tau);
      const dx = s.x - rb.x;
      const dy = s.y - rb.y;
      const dist = Math.hypot(dx, dy);
      const low = ref !== 'sun' && dist - BODIES[ref].R < LOW;
      const descending = (dx * (s.vx - rb.vx) + dy * (s.vy - rb.vy)) / dist < -0.3;
      const flying = !s.landed && !s.dead;
      const coasting = flying && !low && !this.thrusting() && i.p === null;
      const target = coasting ? PACE * (ref === 'sun' ? WARP : WARP_NEAR) : flying && low && descending ? PACE * SLOW : PACE;
      this.pace += (target - this.pace) * (1 - Math.exp(-dt / 0.35));
      this.acc += dt * this.pace;
      while (this.acc >= STEP) {
        this.step(STEP);
        this.acc -= STEP;
      }
      if (this.egg > 0) this.egg -= dt;
    }
    this.follow(dt);
    this.drawAcc += dt;
    const settling = Math.abs(this.cam.ox) + Math.abs(this.cam.oy) > 0.01 || Math.abs(this.cam.logS - Math.log(this.targetScale())) > 0.002;
    if (running || settling) {
      if (this.drawAcc >= 1 / 30) {
        this.drawAcc = 0;
        this.replan();
        this.dirty = true;
      }
    } else if (this.dirty) {
      this.replan();
    }
    if (this.dirty) this.draw();
  }

  private replan() {
    const s = this.ship;
    if (s.landed || s.dead) {
      this.plan = null;
      return;
    }
    const ref = dominant(s.x, s.y, this.tau);
    this.plan = ref === 'sun' ? predict(s, this.tau, 45) : predict(s, this.tau, 25, ref);
  }

  start() {
    if (this.raf) return;
    this.prev = 0;
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      if (this.prev) this.tick(Math.min(0.05, (now - this.prev) / 1000));
      this.prev = now;
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
