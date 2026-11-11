import { AudioDynamics } from './dynamics';
import { isGradientPalette, palettePaint, type PaletteFrame } from './palette';

import type { Frame } from './draw';
import type { FluidStyle, RGB } from './types';

type Point = [number, number];
const TAU = Math.PI * 2;
const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const light = (c: RGB): RGB =>
  c.map((v) => Math.round(v + ((255 - v) * 0.6))) as RGB;

/** Midpoint curves keep both the silhouette and its derivatives soft. */
const curve = (points: Point[], closed = false) => {
  const path = new Path2D();
  if (points.length < 2) return path;
  if (closed) {
    const last = points[points.length - 1];
    path.moveTo((last[0] + points[0][0]) / 2, (last[1] + points[0][1]) / 2);
    for (let i = 0; i < points.length; i++) {
      const next = points[(i + 1) % points.length];
      path.quadraticCurveTo(
        points[i][0],
        points[i][1],
        (points[i][0] + next[0]) / 2,
        (points[i][1] + next[1]) / 2,
      );
    }
    path.closePath();
  } else {
    path.moveTo(...points[0]);
    for (let i = 1; i < points.length - 1; i++) {
      path.quadraticCurveTo(
        points[i][0],
        points[i][1],
        (points[i][0] + points[i + 1][0]) / 2,
        (points[i][1] + points[i + 1][1]) / 2,
      );
    }
    path.lineTo(...points[points.length - 1]);
  }
  return path;
};

/** Live audio sculptures; independent of the recorded track's timeline. */
export class FluidRenderer {
  private readonly dynamics = new AudioDynamics();
  private readonly signal = new Float32Array(256);
  private level = 0;
  private phase = 0;
  private style: FluidStyle | null = null;
  private opacity = 0;
  private pulse = 0;
  private palette: PaletteFrame = { accent: [135, 220, 193] };
  private width = 0;
  private height = 0;

  constructor(private readonly g: CanvasRenderingContext2D) {}

  render(W: number, H: number, f: Frame, dt: number) {
    this.palette = f;
    this.width = W;
    this.height = H;
    this.dynamics.update(f, dt);
    this.level = this.dynamics.level;
    this.phase = this.dynamics.phase;
    this.pulse = this.dynamics.pulse;
    const ease = 1 - Math.exp(-dt * 20);
    for (let i = 0; i < this.signal.length; i++) {
      this.signal[i] += ((f.waveform[i] || 0) - this.signal[i]) * ease;
    }
    const motion = this.dynamics.motion;
    const style = f.style as FluidStyle;
    if (this.style !== style) {
      this.style = style;
      this.opacity = 0;
    }
    this.opacity = Math.min(1, this.opacity + (dt * 3));
    const { g } = this;
    g.save();
    g.globalAlpha = this.opacity;
    const cx = W / 2;
    const cy = H * 0.53;
    const radius = Math.min(W * 0.35, H * 0.29, 330);

    // The atmosphere follows actual loudness, remaining quiet during silence.
    const halo = g.createRadialGradient(
      cx,
      cy,
      0,
      cx,
      cy,
      Math.max(W * 0.43, radius * 1.6),
    );
    halo.addColorStop(
      0,
      rgba(f.accent, 0.025 + (this.level * 0.07) + (this.pulse * motion * 0.025)),
    );
    halo.addColorStop(1, rgba(f.accent, 0));
    g.fillStyle = halo;
    g.fillRect(0, 0, W, H);

    if (style === 'scope') this.scope(cx, cy, radius, f.accent, motion);
    else if (style === 'orbit')
      this.orbit(cx, cy, radius * 0.82, f.accent, motion);
    else this.flow(W, H, cx, cy, f.accent, motion, f.spacing);

    if (!f.playing && !this.level && !f.source && f.emptyText) {
      g.font = '400 12px "Waveflow Pretendard", system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillStyle = 'rgba(242,244,241,0.4)';
      g.fillText(f.emptyText, cx, cy + radius + 42);
    }
    g.restore();
  }

  private ink(alpha: number, lift = 0) {
    return palettePaint(
      this.g,
      this.palette,
      this.width * 0.08,
      this.height * 0.3,
      this.width * 0.92,
      this.height * 0.7,
      alpha,
      lift,
    );
  }

  /** Gaussian filtering in frequency space prevents narrow, jagged spikes. */
  private spectrum(u: number, wrap = false) {
    return this.dynamics.sample(u, wrap);
  }

  private flow(
    W: number,
    H: number,
    cx: number,
    cy: number,
    A: RGB,
    motion: number,
    spacing: number,
  ) {
    const { g } = this;
    const width = Math.min(W * 0.94, 1800);
    const height = Math.min(H * 0.35, 330);
    const top: Point[] = [];
    const bottom: Point[] = [];
    const count = 144;
    for (let i = 0; i <= count; i++) {
      const u = i / count;
      const envelope = Math.sin(Math.PI * u) ** 1.1;
      // Mirror the frequency field around the middle; no invented future samples.
      const frequency = Math.abs((u * 2) - 1) * 0.85;
      const audio = ((this.spectrum(frequency) ** 0.78) * 1.18) + (this.level * 0.2);
      const ripple =
        Math.sin((u * (8 + spacing) * Math.PI) - this.phase) *
        this.level *
        Math.min(motion, 2) *
        0.14;
      const h = Math.min(
        H * 0.36,
        envelope *
          (1 +
            (height *
              Math.max(0, audio + ripple) *
              (1 + (this.pulse * motion * 0.5)))),
      );
      const drift = Math.sin((u * TAU) + this.phase) * this.level * motion * 19;
      const x = (cx - (width / 2)) + (u * width);
      top.push([x, (cy - h) + drift]);
      bottom.push([
        x,
        cy +
          (h * (0.86 + (Math.sin((u * TAU) - this.phase) * motion * 0.04))) +
          drift,
      ]);
    }
    const silhouette = curve([...top, ...[...bottom].reverse()], true);
    for (const offset of [1.12, 1.26]) {
      g.strokeStyle = rgba(A, (this.pulse * motion * 0.1) / offset);
      g.lineWidth = 0.8;
      g.stroke(
        curve(
          [...top, ...[...bottom].reverse()].map(
            ([x, y]): Point => [x, cy + ((y - cy) * offset)],
          ),
          true,
        ),
      );
    }
    const fill = g.createLinearGradient(0, cy - height, 0, cy + height);
    fill.addColorStop(0, rgba(light(A), 0.72));
    fill.addColorStop(0.42, rgba(A, 0.46));
    fill.addColorStop(0.62, rgba(A, 0.24));
    fill.addColorStop(1, rgba(A, 0.06));
    g.fillStyle = isGradientPalette(this.palette.palette)
      ? this.ink(0.58)
      : fill;
    g.fill(silhouette);
    g.save();
    g.shadowColor = rgba(A, 0.35);
    g.shadowBlur = 24;
    g.lineWidth = 2;
    g.strokeStyle = this.ink(0.95, 0.35);
    g.stroke(silhouette);
    g.restore();

    // Fine interior currents give the translucent shape depth without dots.
    for (const amount of [0.28, 0.52, 0.76]) {
      const current = top.map(([x, y]): Point => [x, cy + ((y - cy) * amount)]);
      g.strokeStyle = this.ink(0.16, 0.5);
      g.lineWidth = 0.8;
      g.stroke(curve(current));
      g.stroke(
        curve(bottom.map(([x, y]): Point => [x, cy + ((y - cy) * amount)])),
      );
    }
  }

  private scope(
    cx: number,
    cy: number,
    radius: number,
    A: RGB,
    motion: number,
  ) {
    const { g } = this;
    g.save();
    g.beginPath();
    g.arc(cx, cy, radius, 0, TAU);
    g.fillStyle = 'rgba(6,14,13,0.3)';
    g.fill();
    g.strokeStyle = rgba(A, 0.2);
    g.lineWidth = 1;
    g.stroke();
    g.clip();

    const grid = radius / 4;
    g.beginPath();
    for (let i = -3; i <= 3; i++) {
      const offset = i * grid;
      g.moveTo(cx + offset, cy - radius);
      g.lineTo(cx + offset, cy + radius);
      g.moveTo(cx - radius, cy + offset);
      g.lineTo(cx + radius, cy + offset);
    }
    g.strokeStyle = rgba(A, 0.075);
    g.stroke();

    const points: Point[] = [];
    for (let i = 0; i < this.signal.length; i++) {
      const u = i / (this.signal.length - 1);
      const edge = Math.sin(Math.PI * u) ** 0.35;
      points.push([
        cx + (((u * 2) - 1) * radius),
        cy -
          (this.signal[i] *
            radius *
            Math.min(1.35, 1.08 + (this.pulse * motion * 0.24)) *
            edge),
      ]);
    }
    const trace = curve(points);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = this.ink(0.28);
    g.lineWidth = 7;
    g.stroke(trace);
    g.shadowColor = rgba(A, 0.8);
    g.shadowBlur = 16;
    g.strokeStyle = this.ink(0.98, 0.3);
    g.lineWidth = 2.4;
    g.stroke(trace);
    g.restore();

    g.beginPath();
    g.arc(cx, cy, radius * (1.03 + (this.pulse * motion * 0.08)), 0, TAU);
    g.strokeStyle = rgba(A, this.pulse * motion * 0.18);
    g.lineWidth = 0.8;
    g.stroke();

    // Small calibration marks echo the reference's analogue instrument face.
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      g.moveTo(
        cx + (Math.cos(angle) * (radius + 10)),
        cy + (Math.sin(angle) * (radius + 10)),
      );
      g.lineTo(
        cx + (Math.cos(angle) * (radius + 15)),
        cy + (Math.sin(angle) * (radius + 15)),
      );
    }
    g.strokeStyle = rgba(A, 0.24);
    g.lineWidth = 1;
    g.stroke();
  }

  private orbit(
    cx: number,
    cy: number,
    radius: number,
    A: RGB,
    motion: number,
  ) {
    const { g } = this;
    const points: Point[] = [];
    for (let i = 0; i < 240; i++) {
      const u = i / 240;
      const angle = (u * TAU) - (Math.PI / 2);
      const audio = this.spectrum(u, true);
      const tide =
        Math.sin((angle * 3) + this.phase) * this.level * motion * 0.045;
      const r = radius * (1 + (audio * 0.37) + tide + (this.pulse * motion * 0.12));
      points.push([cx + (Math.cos(angle) * r), cy + (Math.sin(angle) * r)]);
    }
    const ring = curve(points, true);
    const wash = g.createRadialGradient(
      cx,
      cy,
      radius * 0.65,
      cx,
      cy,
      radius * 1.2,
    );
    wash.addColorStop(0, rgba(A, 0));
    wash.addColorStop(0.78, rgba(A, 0.025 + (this.level * 0.035)));
    wash.addColorStop(1, rgba(A, 0));
    g.fillStyle = wash;
    g.fill(ring);

    // Echo contours stay close to the main ring, like light refracted in water.
    for (const scale of [
      0.95,
      1.045 + (this.pulse * motion * 0.04),
      1.1 + (this.pulse * motion * 0.07),
    ]) {
      g.strokeStyle = rgba(
        A,
        ((this.level * 0.16) + (this.pulse * motion * 0.13)) / scale,
      );
      g.lineWidth = 0.75;
      g.stroke(
        curve(
          points.map(
            ([x, y]): Point => [cx + ((x - cx) * scale), cy + ((y - cy) * scale)],
          ),
          true,
        ),
      );
    }
    const ink = g.createLinearGradient(
      cx - radius,
      cy - radius,
      cx + radius,
      cy + radius,
    );
    ink.addColorStop(0, rgba(light(A), 0.95));
    ink.addColorStop(0.45, rgba(A, 0.85));
    ink.addColorStop(0.75, rgba(A, 0.3));
    ink.addColorStop(1, rgba(light(A), 0.85));
    g.strokeStyle = isGradientPalette(this.palette.palette)
      ? this.ink(0.95, 0.2)
      : ink;
    g.lineWidth = 2.5;
    g.shadowColor = rgba(A, 0.5);
    g.shadowBlur = 14;
    g.stroke(ring);
    g.shadowBlur = 0;
  }
}
