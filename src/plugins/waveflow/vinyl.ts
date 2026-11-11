import { AudioDynamics, TAU, rgba } from './dynamics';
import { isGradientPalette, palettePaint } from './palette';
import { recordGeometry } from './record-scrub';

import type { Frame } from './draw';

/** Reference image copy 4: a live waveform sleeve, with a tactile record behind it. */
export class VinylRenderer {
  private readonly audio = new AudioDynamics();
  rotation = 0;
  constructor(private readonly g: CanvasRenderingContext2D) {}

  render(W: number, H: number, f: Frame, dt: number) {
    this.audio.update(f, dt);
    const { g, audio: a } = this;
    if (f.playing && !f.scrubbing)
      this.rotation =
        (this.rotation + (((dt * TAU) / 1.8) * Math.min(1, a.motion))) % TAU;
    const { cx, cy, radius: r, exposedX, sleeve } = recordGeometry(W, H);
    const A = f.accent;
    g.save();
    const halo = g.createRadialGradient(
      cx,
      cy,
      r * 0.75,
      cx,
      cy,
      Math.max(1, r * 1.4),
    );
    halo.addColorStop(0, rgba(A, 0));
    halo.addColorStop(0.5, rgba(A, 0.025 + (a.level * 0.04)));
    halo.addColorStop(1, rgba(A, 0));
    g.fillStyle = halo;
    g.fillRect(cx - (r * 1.4), cy - (r * 1.4), r * 2.8, r * 2.8);
    // Draw the complete disc first, then occlude it with the jacket.
    g.save();
    g.translate(cx, cy);
    const disc = g.createRadialGradient(
      -r * 0.2,
      -r * 0.25,
      0,
      0,
      0,
      Math.max(1, r),
    );
    disc.addColorStop(0, '#202325');
    disc.addColorStop(0.4, '#0b0d0f');
    disc.addColorStop(0.96, '#030506');
    disc.addColorStop(1, '#454b4d');
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.fillStyle = disc;
    g.shadowColor = 'rgba(0,0,0,0.7)';
    g.shadowBlur = 24;
    g.fill();
    g.shadowBlur = 0;
    for (let i = 0; i < 84; i++) {
      g.beginPath();
      g.arc(0, 0, r * (0.35 + (i * 0.0075)), 0, TAU);
      g.strokeStyle = `rgba(223,233,231,${i % 9 === 0 ? 0.12 : 0.045})`;
      g.lineWidth = i % 9 === 0 ? 0.8 : 0.45;
      g.stroke();
    }
    const sheen = g.createLinearGradient(-r, -r, r, r);
    sheen.addColorStop(0, 'rgba(226,240,241,0)');
    sheen.addColorStop(0.23, 'rgba(226,240,241,0.25)');
    sheen.addColorStop(0.39, 'rgba(226,240,241,0.015)');
    sheen.addColorStop(0.7, 'rgba(226,240,241,0.18)');
    sheen.addColorStop(1, 'rgba(226,240,241,0)');
    g.beginPath();
    g.arc(0, 0, r * 0.985, 0, TAU);
    g.fillStyle = sheen;
    g.fill();
    g.rotate(this.rotation);
    for (let i = 0; i < 24; i++) {
      const angle = i * 2.39996;
      g.beginPath();
      g.arc(0, 0, r * (0.39 + ((i % 8) * 0.075)), angle, angle + 0.17);
      g.strokeStyle = 'rgba(237,246,242,0.19)';
      g.lineWidth = 0.7;
      g.stroke();
    }
    g.beginPath();
    g.arc(0, 0, r * 0.32, 0, TAU);
    g.fillStyle = '#e8e7df';
    g.fill();
    for (const radius of [0.28, 0.3]) {
      g.beginPath();
      g.arc(0, 0, r * radius, 0, TAU);
      g.strokeStyle = '#9b9e96';
      g.lineWidth = 0.5;
      g.stroke();
    }
    g.textAlign = 'center';
    g.fillStyle = '#292e2c';
    g.font = `600 ${Math.max(6, r * 0.043)}px "Waveflow Pretendard", system-ui, sans-serif`;
    g.fillText('W A V E F L O W', 0, -r * 0.13);
    g.font = `400 ${Math.max(5, r * 0.034)}px "Waveflow Pretendard", system-ui, sans-serif`;
    g.fillText('SIDE A  ·  33 ⅓', 0, r * 0.16);
    g.beginPath();
    g.arc(0, 0, Math.max(1, r * 0.023), 0, TAU);
    g.fillStyle = '#080b0b';
    g.fill();
    g.restore();
    if (f.duration && f.t > 0) {
      const progress = Math.max(0, Math.min(1, f.t / f.duration));
      g.beginPath();
      g.arc(cx, cy, r + 6, -Math.PI / 2, (-Math.PI / 2) + (TAU * progress));
      g.strokeStyle = rgba(A, f.scrubbing ? 0.85 : 0.28);
      g.lineWidth = f.scrubbing ? 2 : 1;
      g.stroke();
    }
    this.sleeve(sleeve.x, sleeve.y, sleeve.size, f);
    g.textAlign = 'center';
    g.font = '400 10px "Waveflow Pretendard", system-ui, sans-serif';
    g.fillStyle = rgba(A, f.scrubbing ? 0.95 : 0.5);
    g.fillText(
      f.recordHint || '',
      exposedX + (((cx + r) - exposedX) * 0.53),
      cy + r + 24,
    );
    g.restore();
  }

  private sleeve(x: number, y: number, size: number, f: Frame) {
    const { g, audio: a } = this;
    const pulse = a.pulse * a.motion;
    g.save();
    g.beginPath();
    g.rect(x, y, size, size);
    g.clip();
    const paper = g.createLinearGradient(x, y, x + size, y + size);
    paper.addColorStop(0, '#344761');
    paper.addColorStop(0.4, '#59364f');
    paper.addColorStop(0.7, '#51275b');
    paper.addColorStop(1, '#25234a');
    g.fillStyle = paper;
    g.fillRect(x, y, size, size);
    const light = (u: number, v: number, color: string) => {
      const glow = g.createRadialGradient(
        x + (size * u),
        y + (size * v),
        0,
        x + (size * u),
        y + (size * v),
        Math.max(1, size * 0.56),
      );
      glow.addColorStop(0, color);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = glow;
      g.fillRect(x, y, size, size);
    };
    light(0.13, 0.52, `rgba(47,178,208,${0.4 + (a.level * 0.18)})`);
    light(0.86, 0.48, `rgba(233,46,112,${0.4 + (pulse * 0.16)})`);
    light(0.59, 0.49, 'rgba(230,172,76,0.21)');
    light(0.25, 0.9, 'rgba(69,75,164,0.30)');
    const center = y + (size * 0.51);
    const ink = g.createLinearGradient(x, 0, x + size, 0);
    ink.addColorStop(0, 'rgba(137,227,255,0.65)');
    ink.addColorStop(0.45, 'rgba(241,251,239,0.95)');
    ink.addColorStop(0.65, 'rgba(252,222,151,0.9)');
    ink.addColorStop(1, 'rgba(255,149,194,0.65)');
    const peaks = new Path2D(),
      core = new Path2D();
    const count = Math.max(80, Math.min(560, Math.round(size * 1.25)));
    for (let i = 0; i <= count; i++) {
      const u = i / count;
      const signal = f.waveform[Math.floor(u * (f.waveform.length - 1))] || 0;
      const band = a.sample(u);
      const edge = 0.25 + (Math.sin(Math.PI * u) * 0.75);
      const fine = (Math.abs(signal) * 0.1) + (band * 0.055);
      const spike = (Math.max(0, band - 0.16) ** 1.6) * (0.85 + (pulse * 0.4));
      const h = Math.min(size * 0.39, 1 + (size * (fine + spike) * edge * 1.3));
      const px = x + (u * size);
      peaks.moveTo(px, center - h);
      peaks.lineTo(px, center + (h * 0.82));
      const py = center - (signal * size * 0.025);
      if (i === 0) core.moveTo(px, py);
      else core.lineTo(px, py);
    }
    g.strokeStyle = isGradientPalette(f.palette)
      ? palettePaint(g, f, x, y, x + size, y + size, 0.9, 0.15)
      : ink;
    g.lineWidth = 1;
    g.shadowColor = 'rgba(219,246,255,0.6)';
    g.shadowBlur = 16 + (pulse * 8);
    g.stroke(peaks);
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(245,255,254,0.74)';
    g.lineWidth = 0.6;
    g.stroke(peaks);
    g.strokeStyle = '#f0ffff';
    g.lineWidth = 1.1;
    g.stroke(core);
    const flecks = new Path2D();
    for (let i = 0; i < 38; i++) {
      const u = (i * 0.618034) % 1,
        band = a.sample(u);
      if (band < 0.24) continue;
      const px = x + (u * size),
        py = center + (Math.sin(i * 4.9) * size * (0.08 + (band * 0.28)));
      flecks.moveTo(px + 0.7, py);
      flecks.arc(px, py, 0.7 + (pulse * 0.4), 0, TAU);
    }
    g.fillStyle = 'rgba(244,253,246,0.5)';
    g.fill(flecks);
    const pad = Math.max(12, size * 0.055);
    g.textAlign = 'left';
    g.fillStyle = 'rgba(244,239,226,0.64)';
    g.font = `500 ${Math.max(7, size * 0.021)}px "Waveflow Pretendard", system-ui, sans-serif`;
    g.fillText('W A V E F L O W', x + pad, y + pad + 8);
    g.textAlign = 'right';
    g.font = `400 ${Math.max(6, size * 0.016)}px "Waveflow Pretendard", system-ui, sans-serif`;
    g.fillText('SOUND IN YOUR HANDS', (x + size) - pad, y + pad + 8);
    g.textAlign = 'left';
    g.fillStyle = 'rgba(242,240,230,0.5)';
    g.fillText('SIDE A  /  ONE TURN · 30 SECONDS', x + pad, (y + size) - pad);
    g.restore();
    g.strokeStyle = 'rgba(230,228,232,0.16)';
    g.lineWidth = 1;
    g.strokeRect(
      x + 0.5,
      y + 0.5,
      Math.max(0, size - 1),
      Math.max(0, size - 1),
    );
    const spine = g.createLinearGradient(x + size, 0, x + size + 15, 0);
    spine.addColorStop(0, 'rgba(0,0,0,0.55)');
    spine.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = spine;
    g.fillRect(x + size, y, 15, size);
  }
}
