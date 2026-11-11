import { AudioDynamics, TAU, rgba } from './dynamics';
import { palettePaint, type PaletteFrame } from './palette';

import type { Frame } from './draw';
import type { ParticleStyle, RGB } from './types';

const fract = (value: number) => value - Math.floor(value);
const seed = (index: number, channel: number) =>
  fract(Math.sin((index * 127.1) + (channel * 311.7)) * 43758.5453);

/** Bounded, deterministic particle fields. Motion is audio driven and frame-rate independent. */
export class ParticleRenderer {
  private readonly audio = new AudioDynamics();
  private style: ParticleStyle | null = null;
  private opacity = 0;
  private palette: PaletteFrame = { accent: [135, 220, 193] };
  private width = 0;
  private height = 0;

  constructor(private readonly g: CanvasRenderingContext2D) {}

  render(W: number, H: number, f: Frame, dt: number) {
    this.palette = f;
    this.width = W;
    this.height = H;
    this.audio.update(f, dt);
    const style = f.style as ParticleStyle;
    if (this.style !== style) {
      this.style = style;
      this.opacity = 0;
    }
    this.opacity = Math.min(1, this.opacity + (dt * 4));
    const { g } = this;
    g.save();
    g.globalAlpha = this.opacity;
    const halo = g.createRadialGradient(
      W / 2,
      H * 0.53,
      0,
      W / 2,
      H * 0.53,
      Math.max(1, W * 0.48),
    );
    halo.addColorStop(0, rgba(f.accent, 0.025 + (this.audio.level * 0.055)));
    halo.addColorStop(1, rgba(f.accent, 0));
    g.fillStyle = halo;
    g.fillRect(0, 0, W, H);
    if (style === 'constellation') this.constellation(W, H, f.accent);
    else if (style === 'dot-ring') this.halo(W, H, f.spacing);
    else this.dust(W, H, f.spacing);
    g.restore();
  }

  private ink(alpha: number, lift = 0) {
    return palettePaint(
      this.g,
      this.palette,
      0,
      this.height * 0.25,
      this.width,
      this.height * 0.75,
      alpha,
      lift,
    );
  }

  private dot(path: Path2D, x: number, y: number, radius: number) {
    path.moveTo(x + radius, y);
    path.arc(x, y, radius, 0, TAU);
  }

  private dust(W: number, H: number, spacing: number) {
    const { g, audio: a } = this;
    const paths = [new Path2D(), new Path2D(), new Path2D()];
    const count = Math.min(650, Math.max(160, Math.floor(W / (spacing * 0.6))));
    const pulse = a.pulse * a.motion;
    for (let i = 0; i < count; i++) {
      const u = fract(seed(i, 0) + (a.phase * (0.015 + (seed(i, 1) * 0.018))));
      const x = W * (0.06 + (u * 0.88));
      const depth = seed(i, 2);
      const band = a.sample(u);
      const envelope = Math.sin(u * Math.PI) ** 0.6;
      const current = Math.sin((u * TAU * 2.5) + a.phase + (depth * 4));
      const scatter = (seed(i, 3) - 0.5) * (0.1 + (band * 0.8) + (pulse * 0.25));
      const y =
        (H * 0.53) + (H * envelope * ((current * a.level * 0.12) + (scatter * 0.62)));
      const r = 0.65 + (depth * 1.6) + (band * 2.2) + (pulse * depth * 1.6);
      this.dot(paths[Math.min(2, Math.floor(depth * 3))], x, y, r);
    }
    paths.forEach((path, i) => {
      g.fillStyle = this.ink(0.3 + (i * 0.28), i === 2 ? 0.35 : 0);
      g.fill(path);
    });
  }

  private constellation(W: number, H: number, A: RGB) {
    const { g, audio: a } = this;
    const count = W < 600 ? 60 : 96;
    const points: [number, number, number][] = [];
    const pulse = a.pulse * a.motion;
    const radius = Math.min(W * 0.43, H * 0.36, 500);
    for (let i = 0; i < count; i++) {
      const angle = (seed(i, 0) * TAU) + (a.phase * 0.04 * (i % 2 ? 1 : -1));
      const depth = Math.sqrt(seed(i, 1));
      const band = a.sample(seed(i, 2));
      const r = radius * depth * (0.8 + (band * 0.14) + (pulse * 0.12));
      points.push([
        (W / 2) + (Math.cos(angle) * r),
        (H * 0.53) +
          (Math.sin(angle) *
            r *
            Math.min(0.72, (H * 0.28) / Math.max(1, radius))),
        1 + (seed(i, 3) * 1.5) + (band * 1.4) + (pulse * 1.2),
      ]);
    }
    const links = new Path2D();
    const distance = Math.min(145, radius * 0.37);
    for (let i = 0; i < points.length; i++) {
      let neighbours = 0;
      for (let j = i + 1; j < points.length && neighbours < 3; j++) {
        if (
          Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]) <
          distance
        ) {
          links.moveTo(points[i][0], points[i][1]);
          links.lineTo(points[j][0], points[j][1]);
          neighbours++;
        }
      }
    }
    g.strokeStyle = this.ink(0.1 + (a.level * 0.16) + (pulse * 0.12));
    g.lineWidth = 0.65;
    g.stroke(links);
    const stars = new Path2D();
    for (const [x, y, r] of points) this.dot(stars, x, y, r);
    g.fillStyle = this.ink(0.9, 0.25);
    g.shadowBlur = 8 + (pulse * 8);
    g.shadowColor = rgba(A, 0.45);
    g.fill(stars);
    g.shadowBlur = 0;
  }

  private halo(W: number, H: number, spacing: number) {
    const { g, audio: a } = this;
    const radius = Math.min(W * 0.3, H * 0.245, 235);
    const pulse = a.pulse * a.motion;
    const count = Math.round(120 - (spacing * 6));
    for (let ring = 0; ring < 7; ring++) {
      const points = new Path2D();
      for (let i = 0; i < count; i++) {
        const u = i / count;
        const angle =
          (u * TAU) + (a.phase * (ring % 2 ? -0.11 : 0.14)) + (ring * 0.08);
        const band = a.sample(u, true);
        const ripple =
          Math.sin(((angle * 4) - a.phase) + (ring * 0.5)) *
          a.level *
          a.motion *
          0.035;
        const r =
          radius * (0.38 + (ring * 0.115) + (band * 0.13) + ripple + (pulse * 0.09));
        const size = 0.8 + (band * 1.35) + (ring * 0.075) + (pulse * 0.55);
        this.dot(
          points,
          (W / 2) + (Math.cos(angle) * r),
          (H * 0.53) + (Math.sin(angle) * r),
          size,
        );
      }
      g.fillStyle = this.ink(0.24 + (ring * 0.095), ring > 4 ? 0.3 : 0);
      g.fill(points);
    }
  }
}
