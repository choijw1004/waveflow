import { BOUNCE_BINS } from './audio';

import type { Frame } from './draw';
import type { RGB } from './types';

export const TAU = Math.PI * 2;
export const rgba = (c: RGB, a: number) =>
  `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a))})`;
export const lighter = (c: RGB): RGB =>
  c.map((v) => Math.round(v + ((255 - v) * 0.65))) as RGB;

/** Fast attack, gentle release, and a transient envelope derived from actual bass energy. */
export class AudioDynamics {
  readonly bands = new Float32Array(BOUNCE_BINS);
  level = 0;
  pulse = 0;
  phase = 0;
  motion = 0;
  private bass = 0;
  private readonly reduced = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  );

  update(f: Frame, dt: number) {
    this.motion = this.reduced.matches ? 0 : f.motion;
    const amount = 1 - Math.exp(-dt * (f.level > this.level ? 28 : 7));
    this.level += (f.level - this.level) * amount;
    let bass = 0;
    for (let i = 0; i < this.bands.length; i++) {
      const target = f.bounce[i] || 0;
      const ease = 1 - Math.exp(-dt * (target > this.bands[i] ? 30 : 8));
      this.bands[i] += (target - this.bands[i]) * ease;
      if (i < 12) bass += target / 12;
    }
    const onset = f.playing ? Math.max(0, bass - this.bass - 0.025) * 3.5 : 0;
    this.pulse = Math.max(this.pulse * Math.exp(-dt * 5.5), Math.min(1, onset));
    this.bass += (bass - this.bass) * (1 - Math.exp(-dt * 3));
    if (f.playing) this.phase += dt * this.motion * (0.65 + (this.level * 1.25));
  }

  sample(u: number, wrap = false) {
    const x = u * (wrap ? this.bands.length : this.bands.length - 1);
    let value = 0;
    let weight = 0;
    for (let j = -4; j <= 4; j++) {
      const k = Math.round(x) + j;
      const i = wrap
        ? ((k % this.bands.length) + this.bands.length) % this.bands.length
        : Math.max(0, Math.min(this.bands.length - 1, k));
      const w = Math.exp(-((k - x) ** 2) / 7);
      value += this.bands[i] * w;
      weight += w;
    }
    return value / weight;
  }
}
