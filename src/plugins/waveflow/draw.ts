import { BOUNCE_BINS } from './audio';
import { FluidRenderer } from './fluid';
import { paletteColor, palettePaint, type PaletteFrame } from './palette';
import { ParticleRenderer } from './particles';
import { recordGeometry } from './record-scrub';
import { BAR_RATE, type LiveHistory, type WaveSource } from './track';
import { isFluidStyle, isParticleStyle, type RGB, type WaveStyle } from './types';
import { VinylRenderer } from './vinyl';

/** Reflection height relative to the bar above the baseline. */
const MIR = 0.42;
const WHITE: RGB = [255, 255, 255];

export type Frame = PaletteFrame & {
  /** Playhead position in seconds. */
  t: number;
  source: WaveSource | null;
  live: LiveHistory;
  style: WaveStyle;
  accent: RGB;
  spacing: number;
  /** 0 = off, 1 = normal, 1.9 = strong. */
  motion: number;
  level: number;
  bounce: Float32Array;
  waveform: Float32Array;
  playing: boolean;
  /** Shown above the baseline when there is nothing to draw yet. */
  emptyText: string;
  duration?: number;
  scrubbing?: boolean;
  recordHint?: string;
};

export type Geometry = {
  base: number;
  maxUp: number;
  phX: number;
  sp: number;
  bw: number;
  /** Pixels per second. */
  pps: number;
};

const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/** Playhead position as a fraction of the width. */
const playheadRatio = (f: Pick<Frame, 'style' | 'source'>) => {
  if (f.style === 'live' || !f.source) return 0.68;
  return f.source.knowsFuture ? 0.5 : 0.75;
};

/** Canvas painter ported from reference/waveflow-demo.html. Knows nothing about where bars come from. */
export class WaveRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly g: CanvasRenderingContext2D;
  private W = 0;
  private H = 0;
  private ratio = 0.5;
  private motionTime = 0;
  private colorPhase = 0;
  private palette: PaletteFrame = { accent: [135, 220, 193] };
  private readonly reduced = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  );
  private motion = 1;
  private bounce: Float32Array = new Float32Array(BOUNCE_BINS);
  private level = 0;
  private readonly fluid: FluidRenderer;
  private readonly particles: ParticleRenderer;
  private readonly vinyl: VinylRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const g = canvas.getContext('2d');
    if (!g) throw new Error('[waveflow] canvas 2d context unavailable');
    this.g = g;
    this.fluid = new FluidRenderer(g);
    this.particles = new ParticleRenderer(g);
    this.vinyl = new VinylRenderer(g);
  }

  get recordRotation() {
    return this.vinyl.rotation;
  }
  set recordRotation(angle: number) {
    this.vinyl.rotation = angle;
  }
  recordGeometry() {
    return recordGeometry(this.W, this.H);
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = this.canvas.clientWidth;
    this.H = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  geometry(f: Pick<Frame, 'spacing' | 'style' | 'source'>): Geometry {
    const { W, H } = this;
    const sp = f.spacing;
    return {
      base: Math.round(H * (W < 720 ? 0.56 : 0.6)),
      maxUp: Math.min(H * 0.34, 390),
      phX: Math.round(W * this.ratio),
      sp,
      bw: Math.max(1.5, sp * 0.62),
      pps: sp * BAR_RATE,
    };
  }

  /** Jump the playhead to where it belongs (no easing), e.g. when the overlay opens. */
  snap(f: Pick<Frame, 'style' | 'source'>) {
    this.ratio = playheadRatio(f);
  }

  render(f: Frame, dt: number) {
    const { g, W, H } = this;
    const motion = this.reduced.matches ? 0 : f.motion;
    if (f.playing && motion > 0) {
      this.motionTime += dt * (0.9 + (motion * 0.25));
      this.colorPhase += dt * (0.035 + (motion * 0.015));
    }
    f = { ...f, motion, colorPhase: this.colorPhase };
    this.palette = f;
    f = { ...f, accent: paletteColor(f, 0.25) };
    this.motion = f.motion;
    this.bounce = f.bounce;
    this.level = f.level;
    // ease the playhead between layouts (first listen ↔ replay ↔ live)
    this.ratio += (playheadRatio(f) - this.ratio) * (1 - (0.9 ** (dt * 60)));

    g.clearRect(0, 0, W, H);
    if (f.style === 'vinyl') {
      this.vinyl.render(W, H, f, dt);
      return;
    }
    if (isParticleStyle(f.style)) {
      this.particles.render(W, H, f, dt);
      return;
    }
    if (isFluidStyle(f.style)) {
      this.fluid.render(W, H, f, dt);
      return;
    }
    const G = this.geometry(f);
    const A = f.accent;
    const src = f.source;

    if (f.style === 'live' || !src) {
      if (!f.live.values.length && !f.playing) return this.drawEmpty(G, f);
      this.drawLive(G, f.live, f.playing);
    } else if (f.style === 'ribbon') this.drawRibbon(f.t, G, A, src);
    else if (f.style === 'spectrum') this.drawSpectrum(f.t, G, src);
    else this.drawBars(f.t, G, src, f.style === 'dots');

    this.edgeFade();
    this.drawOverlay(G, A);
  }

  private ink(alpha: number, lift = 0) {
    return palettePaint(
      this.g,
      this.palette,
      0,
      this.H * 0.25,
      this.W,
      this.H * 0.75,
      alpha,
      lift,
    );
  }

  // extra height (px) for a bar `d` bars away from the playhead: spectrum bounce near the
  // playhead, a ripple travelling outward, and a faint shimmer everywhere
  private wobble(d: number, maxUp: number) {
    const amt = this.motion;
    if (!amt) return 0;
    const ad = Math.abs(d);
    const spec =
      this.bounce[Math.min(BOUNCE_BINS - 1, Math.floor(ad * 0.9))] *
      Math.exp(-ad / 46);
    const ripple =
      ((Math.sin((ad * 0.32) - (this.motionTime * 7)) * 0.5) + 0.5) *
      Math.exp(-ad / 90);
    const shimmer = (Math.sin((d * 1.9) + (this.motionTime * 3.1)) * 0.5) + 0.5;
    return (
      amt *
      maxUp *
      ((spec * 0.48) + (this.level * ripple * 0.12) + (this.level * shimmer * 0.05))
    );
  }

  private visibleRange(t: number, G: Geometry, length: number) {
    const i0 = Math.floor((t - (G.phX / G.pps)) * BAR_RATE) - 2;
    const i1 = Math.ceil((t + ((this.W - G.phX) / G.pps)) * BAR_RATE) + 2;
    return [Math.max(0, i0), Math.min(length - 1, i1)] as const;
  }

  private xOf(i: number, t: number, G: Geometry) {
    return G.phX + (((i / BAR_RATE) - t) * G.pps);
  }

  /** Bars that haven't been heard yet (or were skipped): a faint dotted trace on the baseline. */
  private gapMark(p: Path2D, i: number, x: number, G: Geometry) {
    if (i % 2 === 0) p.rect(x, G.base - 1, G.bw, 2);
  }

  /** The part of a first listen that hasn't played yet. */
  private futureGuide(G: Geometry) {
    this.g.fillStyle = 'rgba(255,255,255,0.14)';
    for (let x = G.phX + 10; x < this.W; x += 8) {
      this.g.fillRect(x, G.base - 0.5, 2, 1);
    }
  }

  private drawBars(
    t: number,
    G: Geometry,
    src: WaveSource,
    dots: boolean,
  ) {
    const { g } = this;
    const [i0, i1] = this.visibleRange(t, G, src.length);
    const cur = t * BAR_RATE;
    const pt = new Path2D();
    const pm = new Path2D();
    const ft = new Path2D();
    const fm = new Path2D();
    const gap = new Path2D();
    const pitch = Math.max(4, G.sp);
    for (let i = i0; i <= i1; i++) {
      const past = i < cur;
      if (!past && !src.knowsFuture) break;
      const x = this.xOf(i, t, G);
      if (!src.has(i)) {
        this.gapMark(gap, i, x, G);
        continue;
      }
      const h = Math.max(
        1.5,
        (src.peak(i) * G.maxUp) + this.wobble(i - cur, G.maxUp),
      );
      const top = past ? pt : ft;
      const mir = past ? pm : fm;
      if (dots) {
        const n = Math.max(1, Math.round(h / pitch));
        const m = Math.round(n * MIR);
        for (let k = 0; k < n; k++) {
          top.rect(x, G.base - ((k + 1) * pitch), G.bw, G.bw);
        }
        for (let k = 0; k < m; k++) {
          mir.rect(x, G.base + 3 + (k * pitch), G.bw, G.bw);
        }
      } else {
        top.rect(x, G.base - h, G.bw, h);
        mir.rect(x, G.base + 2, G.bw, h * MIR);
      }
    }
    g.fillStyle = this.ink(1);
    g.fill(pt);
    g.fillStyle = this.ink(0.26);
    g.fill(pm);
    g.fillStyle = 'rgba(255,255,255,0.24)';
    g.fill(ft);
    g.fillStyle = 'rgba(255,255,255,0.07)';
    g.fill(fm);
    g.fillStyle = 'rgba(255,255,255,0.16)';
    g.fill(gap);
    if (!src.knowsFuture) this.futureGuide(G);
  }

  private ribbonPath(pts: [number, number][], G: Geometry, mirror: boolean) {
    const p = new Path2D();
    if (pts.length < 2) return p;
    const y = (h: number) => (mirror ? G.base + 2 + (h * MIR) : G.base - h);
    p.moveTo(pts[0][0], G.base);
    p.lineTo(pts[0][0], y(pts[0][1]));
    for (let k = 1; k < pts.length - 1; k++) {
      const mx = (pts[k][0] + pts[k + 1][0]) / 2;
      const my = (y(pts[k][1]) + y(pts[k + 1][1])) / 2;
      p.quadraticCurveTo(pts[k][0], y(pts[k][1]), mx, my);
    }
    const last = pts[pts.length - 1];
    p.lineTo(last[0], y(last[1]));
    p.lineTo(last[0], G.base);
    p.closePath();
    return p;
  }

  private drawRibbon(t: number, G: Geometry, A: RGB, src: WaveSource) {
    const { g, W, H } = this;
    const [i0, i1] = this.visibleRange(t, G, src.length);
    const cur = t * BAR_RATE;
    const known = (i: number) => src.knowsFuture || i < cur;
    const pv = (i: number) => (known(i) ? src.peak(i) : 0);
    const pts: [number, number][] = [];
    for (let i = i0; i <= i1; i++) {
      if (!known(i)) break;
      const prev = i > 0 ? pv(i - 1) : pv(i);
      const next = i < src.length - 1 ? pv(i + 1) : pv(i);
      const v = (pv(i) + prev + next) / 3;
      pts.push([
        this.xOf(i, t, G) + (G.bw / 2),
        Math.max(1, (v * G.maxUp) + this.wobble(i - cur, G.maxUp)),
      ]);
    }
    const top = this.ribbonPath(pts, G, false);
    const mir = this.ribbonPath(pts, G, true);
    const gradTop = (c: RGB, a1: number, a2: number) => {
      const gr = g.createLinearGradient(0, G.base - G.maxUp, 0, G.base);
      gr.addColorStop(0, rgba(c, a1));
      gr.addColorStop(1, rgba(c, a2));
      return gr;
    };
    const gradMir = (c: RGB, a: number) => {
      const gr = g.createLinearGradient(0, G.base, 0, G.base + (G.maxUp * MIR));
      gr.addColorStop(0, rgba(c, a));
      gr.addColorStop(1, rgba(c, 0));
      return gr;
    };
    g.save();
    g.beginPath();
    g.rect(0, 0, G.phX, H);
    g.clip();
    g.fillStyle =
      this.palette.palette && this.palette.palette !== 'album'
        ? this.ink(0.68)
        : gradTop(A, 0.95, 0.35);
    g.fill(top);
    g.fillStyle =
      this.palette.palette && this.palette.palette !== 'album'
        ? this.ink(0.18)
        : gradMir(A, 0.3);
    g.fill(mir);
    g.restore();
    g.save();
    g.beginPath();
    g.rect(G.phX, 0, W - G.phX, H);
    g.clip();
    g.fillStyle = gradTop(WHITE, 0.22, 0.08);
    g.fill(top);
    g.fillStyle = gradMir(WHITE, 0.08);
    g.fill(mir);
    g.restore();
    if (!src.knowsFuture) this.futureGuide(G);
  }

  private drawSpectrum(t: number, G: Geometry, src: WaveSource) {
    const { g } = this;
    const [i0, i1] = this.visibleRange(t, G, src.length);
    const cur = t * BAR_RATE;

    const P = {
      l: new Path2D(),
      m: new Path2D(),
      h: new Path2D(),
      r: new Path2D(),
    };
    const F = {
      l: new Path2D(),
      m: new Path2D(),
      h: new Path2D(),
      r: new Path2D(),
    };
    const gap = new Path2D();
    for (let i = i0; i <= i1; i++) {
      const past = i < cur;
      if (!past && !src.knowsFuture) break;
      const x = this.xOf(i, t, G);
      if (!src.has(i)) {
        this.gapMark(gap, i, x, G);
        continue;
      }
      const wb = this.wobble(i - cur, G.maxUp);
      const hl = Math.max(1.5, (src.band(0, i) * G.maxUp * 0.56) + (wb * 0.55));
      const hm = (src.band(1, i) * G.maxUp * 0.3) + (wb * 0.3);
      const hh = (src.band(2, i) * G.maxUp * 0.2) + (wb * 0.15);
      const S = past ? P : F;
      let y = G.base - hl;
      S.l.rect(x, y, G.bw, hl);
      if (hm > 1) {
        y -= hm + 1.5;
        S.m.rect(x, y, G.bw, hm);
      }
      if (hh > 1) {
        y -= hh + 1.5;
        S.h.rect(x, y, G.bw, hh);
      }
      S.r.rect(x, G.base + 2, G.bw, (G.base - y) * MIR);
    }
    g.fillStyle = this.ink(1);
    g.fill(P.l);
    g.fillStyle = this.ink(0.95, 0.3);
    g.fill(P.m);
    g.fillStyle = rgba(WHITE, 0.85);
    g.fill(P.h);
    g.fillStyle = this.ink(0.24);
    g.fill(P.r);
    g.fillStyle = 'rgba(255,255,255,0.26)';
    g.fill(F.l);
    g.fillStyle = 'rgba(255,255,255,0.17)';
    g.fill(F.m);
    g.fillStyle = 'rgba(255,255,255,0.11)';
    g.fill(F.h);
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.fill(F.r);
    g.fillStyle = 'rgba(255,255,255,0.16)';
    g.fill(gap);
    if (!src.knowsFuture) this.futureGuide(G);
  }

  private drawLive(G: Geometry, live: LiveHistory, playing: boolean) {
    const { g } = this;
    const top = new Path2D();
    const mir = new Path2D();
    const frac = live.acc * BAR_RATE;
    const add = (x: number, v: number, d: number) => {
      const h = Math.max(1.5, (v * G.maxUp) + this.wobble(d, G.maxUp));
      top.rect(x, G.base - h, G.bw, h);
      mir.rect(x, G.base + 2, G.bw, h * MIR);
    };
    if (playing) add(G.phX - (G.sp * frac), this.level, 0);
    const hist = live.values;
    for (let k = 0; k < hist.length; k++) {
      const x = G.phX - ((k + 1 + frac) * G.sp);
      if (x < -G.sp) break;
      add(x, hist[hist.length - 1 - k], k + 1);
    }
    g.fillStyle = this.ink(1);
    g.fill(top);
    g.fillStyle = this.ink(0.26);
    g.fill(mir);
    this.futureGuide(G);
  }

  private drawEmpty(G: Geometry, f: Frame) {
    const { g, W } = this;
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(0, G.base, W, 1);
    if (!f.emptyText) return;
    g.font =
      '500 13px "Waveflow Pretendard", Pretendard, system-ui, sans-serif';
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.fillText(f.emptyText, W / 2, G.base - 16);
  }

  private edgeFade() {
    const { g, W, H } = this;
    g.globalCompositeOperation = 'destination-in';
    const gr = g.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.1, 'rgba(0,0,0,1)');
    gr.addColorStop(0.9, 'rgba(0,0,0,1)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'source-over';
  }

  /** Baseline and the soft glow where the playhead is (no vertical line, no time label). */
  private drawOverlay(G: Geometry, A: RGB) {
    const { g, W } = this;
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(0, G.base, W, 1);
    const r = 4 + (this.level * 26);
    const gl = g.createRadialGradient(G.phX, G.base, 0, G.phX, G.base, r * 3);
    gl.addColorStop(0, rgba(A, 0.55 * (0.3 + this.level)));
    gl.addColorStop(1, rgba(A, 0));
    g.fillStyle = gl;
    g.fillRect(G.phX - (r * 3), G.base - (r * 3), r * 6, r * 6);
  }
}
