/** Bars per second of audio. */
export const BAR_RATE = 20;

/** Channels stored per bar: overall loudness, then low / mid / high bands. */
const CHANNELS = 4;
/** Lowest normalisation reference per channel, so silence never blows up to full height. */
const REF_FLOOR = [0.02, 1e-4, 1e-4, 1e-4];
/** A replay uses the centred, whole-track layout once at least this much of the song was heard. */
export const CACHED_MIN_COVERAGE = 0.3;

export type WaveRecord = {
  id: string;
  v: 1;
  rate: number;
  duration: number;
  peaks: Float32Array;
  low: Float32Array;
  mid: Float32Array;
  high: Float32Array;
  /** 1 where the bar was actually heard; skipped sections stay 0. */
  have: Uint8Array;
  updated: number;
};

/**
 * Per-song waveform, filled in bar by bar as the song plays (indexed by playback position, so
 * seeks leave gaps instead of corrupting the timeline). Values are stored raw and normalised
 * on read against the 98.5th percentile of what has been heard, like the demo's full-file analysis.
 */
export class TrackWave {
  readonly id: string;
  readonly duration: number;
  readonly length: number;
  readonly have: Uint8Array;
  collected = 0;
  /** Changed since the last save. */
  dirty = false;

  private readonly data: Float32Array[];
  private readonly refs = new Float32Array(CHANNELS);
  private readonly targets = new Float32Array(CHANNELS);
  private refsAt = -1;
  private readonly scratch: Float32Array;

  constructor(id: string, duration: number, record?: WaveRecord | null) {
    this.id = id;
    this.duration = duration;
    this.length = Math.max(1, Math.ceil(duration * BAR_RATE));
    this.have = new Uint8Array(this.length);
    this.data = Array.from(
      { length: CHANNELS },
      () => new Float32Array(this.length),
    );
    this.scratch = new Float32Array(this.length);

    if (record && TrackWave.fits(record, duration)) {
      const src = [record.peaks, record.low, record.mid, record.high];
      const n = Math.min(this.length, record.have.length);
      for (let c = 0; c < CHANNELS; c++) {
        this.data[c].set(src[c].subarray(0, n));
      }
      this.have.set(record.have.subarray(0, n));
      for (let i = 0; i < n; i++) this.collected += this.have[i];
    }

    this.computeTargets();
    this.refs.set(this.targets);
  }

  /** Whether a stored record belongs to the same version of the song. */
  static fits(record: WaveRecord, duration: number) {
    return (
      record.v === 1 &&
      record.rate === BAR_RATE &&
      Math.abs(record.duration - duration) < 1.5 &&
      record.have instanceof Uint8Array
    );
  }

  get coverage() {
    return this.collected / this.length;
  }

  has(i: number) {
    return i >= 0 && i < this.length && this.have[i] === 1;
  }

  /** Normalised 0..1 value of channel `c` at bar `i` (0 when that bar was never heard). */
  value(c: number, i: number) {
    if (!this.has(i)) return 0;
    return Math.min(1, (this.data[c][i] / this.refs[c]) ** 0.78);
  }

  /** Stores bar `i`. `fresh` overwrites (first sample of a pass), otherwise keeps the max. */
  write(i: number, values: readonly number[], fresh: boolean) {
    if (i < 0 || i >= this.length) return;
    if (!this.have[i]) {
      this.have[i] = 1;
      this.collected++;
      fresh = true;
    }
    for (let c = 0; c < CHANNELS; c++) {
      const v = values[c] || 0;
      this.data[c][i] = fresh ? v : Math.max(this.data[c][i], v);
    }
    this.dirty = true;
  }

  /** Once per frame: refresh the normalisation targets now and then, and ease towards them. */
  tick(dt: number) {
    const step = this.collected < 200 ? 4 : BAR_RATE * 2;
    if (Math.abs(this.collected - this.refsAt) >= step) this.computeTargets();
    const k = 1 - (0.94 ** (dt * 60));
    for (let c = 0; c < CHANNELS; c++) {
      // jump straight up from the floor so the first seconds aren't drawn at full height
      if (this.refs[c] <= REF_FLOOR[c] * 1.001) this.refs[c] = this.targets[c];
      else this.refs[c] += (this.targets[c] - this.refs[c]) * k;
    }
  }

  private computeTargets() {
    this.refsAt = this.collected;
    for (let c = 0; c < CHANNELS; c++) {
      const col = this.data[c];
      let n = 0;
      for (let i = 0; i < this.length; i++) {
        if (this.have[i]) this.scratch[n++] = col[i];
      }
      if (!n) {
        this.targets[c] = REF_FLOOR[c];
        continue;
      }
      const sorted = this.scratch.subarray(0, n).sort();
      const p = sorted[Math.min(n - 1, Math.floor(n * 0.985))];
      this.targets[c] = Math.max(p, REF_FLOOR[c]);
    }
  }

  toRecord(): WaveRecord {
    const [peaks, low, mid, high] = this.data;
    return {
      id: this.id,
      v: 1,
      rate: BAR_RATE,
      duration: this.duration,
      peaks,
      low,
      mid,
      high,
      have: this.have,
      updated: Date.now(),
    };
  }
}

/** Writes analyser samples into the bar under the current playback position. */
export class Recorder {
  private slot = -1;
  private readonly values = [0, 0, 0, 0];

  reset() {
    this.slot = -1;
  }

  record(wave: TrackWave, time: number, rms: number, bands: readonly number[]) {
    const i = Math.floor(time * BAR_RATE);
    this.values[0] = rms;
    this.values[1] = bands[0];
    this.values[2] = bands[1];
    this.values[3] = bands[2];
    wave.write(i, this.values, i !== this.slot);
    this.slot = i;
  }
}

/** Where the drawing code gets bar heights from. */
export interface WaveSource {
  readonly kind: 'live' | 'cached';
  /** Known future → playhead centred and upcoming bars drawn grey. Unknown → only the past. */
  readonly knowsFuture: boolean;
  readonly length: number;
  readonly coverage: number;
  has(i: number): boolean;
  /** Overall loudness 0..1. */
  peak(i: number): number;
  /** Band loudness 0..1 (0 = low, 1 = mid, 2 = high). */
  band(k: 0 | 1 | 2, i: number): number;
}

abstract class TrackSource implements WaveSource {
  abstract readonly kind: 'live' | 'cached';
  abstract readonly knowsFuture: boolean;

  protected readonly wave: TrackWave;

  constructor(wave: TrackWave) {
    this.wave = wave;
  }

  get length() {
    return this.wave.length;
  }
  get coverage() {
    return this.wave.coverage;
  }
  has(i: number) {
    return this.wave.has(i);
  }
  peak(i: number) {
    return this.wave.value(0, i);
  }
  band(k: 0 | 1 | 2, i: number) {
    return this.wave.value(k + 1, i);
  }
}

/** First listen: only what has been heard so far. */
export class LiveSource extends TrackSource {
  readonly kind = 'live';
  readonly knowsFuture = false;
}

/** Replay: the waveform collected on earlier plays (kept up to date while playing). */
export class CachedSource extends TrackSource {
  readonly kind = 'cached';
  readonly knowsFuture = true;
}

export const sourceFor = (wave: TrackWave): WaveSource =>
  wave.coverage >= CACHED_MIN_COVERAGE
    ? new CachedSource(wave)
    : new LiveSource(wave);

/** Real-time loudness history for the "live" style, independent of the song position. */
export class LiveHistory {
  readonly values: number[] = [];
  /** Seconds accumulated towards the next bar (for smooth scrolling). */
  acc = 0;
  private max = 0;

  push(v: number, dt: number) {
    this.max = Math.max(this.max, v);
    this.acc += dt;
    const step = 1 / BAR_RATE;
    while (this.acc >= step) {
      this.values.push(this.max);
      this.max = v;
      this.acc -= step;
    }
    if (this.values.length > 4000) {
      this.values.splice(0, this.values.length - 4000);
    }
  }

  reset() {
    this.values.length = 0;
    this.acc = 0;
    this.max = 0;
  }
}
