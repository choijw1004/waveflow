/** Number of frequency buckets that drive the "bounce" motion near the playhead. */
export const BOUNCE_BINS = 72;

// Rough split matching the demo's filters: lowpass 220 Hz, bandpass ~1.3 kHz, highpass 4.2 kHz.
const BAND_RANGES: [number, number][] = [
  [30, 220],
  [500, 3200],
  [4200, 16000],
];

/** Scales a per-frame (60 fps) factor to an arbitrary time step. */
const perFrame = (factor: number, dt: number) => factor ** (dt * 60);

/**
 * Taps Pear Desktop's shared MediaElementAudioSourceNode with an AnalyserNode.
 * The source already plays to the destination, so the analyser is a dead end on purpose.
 */
export class AudioTap {
  /** Raw RMS of the latest read. */
  rms = 0;
  /** Raw amplitudes of the low / mid / high bands of the latest read. */
  readonly bands: [number, number, number] = [0, 0, 0];
  /** Loudness 0..1 against a slowly decaying running max (unsmoothed). */
  instant = 0;
  /** `instant`, smoothed. Drives the glow, ripple and shimmer. */
  level = 0;
  /** Per-frequency bounce 0..1 for the motion effect. */
  readonly bounce = new Float32Array(BOUNCE_BINS);
  /** Phase-aligned, downsampled audio for the oscilloscope. */
  readonly waveform = new Float32Array(256);

  private source: AudioNode | null = null;
  private analyser: AnalyserNode | null = null;
  /** Context created for the captureStream fallback; closed on detach. */
  private ownContext: AudioContext | null = null;
  private timeData = new Float32Array(2048);
  private freqData = new Float32Array(1024);
  private bandBins: [number, number][] = [];
  private ref = 0.08;

  get attached() {
    return this.analyser !== null;
  }

  /** Tapping Pear's shared audio graph (as opposed to the captureStream fallback). */
  get shared() {
    return this.attached && !this.ownContext;
  }

  /** Called on every `peard:audio-can-play`; the source node is shared, so only connect once. */
  attach(context: AudioContext, source: MediaElementAudioSourceNode) {
    if (this.source === source && this.analyser) return;
    this.detach();
    this.connect(context, source);
  }

  /**
   * Fallback for when Pear's `peard:audio-can-play` was never sent for the current song (e.g. a
   * paused song restored at startup): analyse a captured copy of the element's output in our
   * own AudioContext. Replaced by the shared graph as soon as Pear's event arrives.
   */
  attachCapture(media: HTMLMediaElement) {
    if (this.attached) return true;
    try {
      const stream = (
        media as HTMLMediaElement & { captureStream(): MediaStream }
      ).captureStream();
      if (!stream.getAudioTracks().length) return false;
      const context = new AudioContext();
      context.resume().catch(() => {});
      this.connect(context, context.createMediaStreamSource(stream));
      this.ownContext = context;
      return true;
    } catch (err) {
      console.warn('[waveflow] could not capture audio', err);
      return false;
    }
  }

  private connect(context: BaseAudioContext, source: AudioNode) {
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    this.source = source;
    this.analyser = analyser;
    this.timeData = new Float32Array(analyser.fftSize);
    this.freqData = new Float32Array(analyser.frequencyBinCount);

    const hz = context.sampleRate / analyser.fftSize;
    const last = analyser.frequencyBinCount - 1;
    const bin = (f: number) => Math.max(1, Math.min(last, Math.round(f / hz)));
    this.bandBins = BAND_RANGES.map(([lo, hi]) => [bin(lo), bin(hi)]);
  }

  detach() {
    if (this.source && this.analyser) {
      try {
        this.source.disconnect(this.analyser);
      } catch {
        // already disconnected
      }
    }
    this.ownContext?.close().catch(() => {});
    this.ownContext = null;
    this.source = null;
    this.analyser = null;
  }

  /** Reads the analyser. Returns false (and lets everything decay) when nothing is playing. */
  sample(playing: boolean, dt: number): boolean {
    const analyser = this.analyser;
    if (!playing || !analyser) {
      this.rms = 0;
      this.bands.fill(0);
      this.instant = 0;
      this.level *= perFrame(0.9, dt);
      const decay = perFrame(0.9, dt);
      for (let k = 0; k < BOUNCE_BINS; k++) this.bounce[k] *= decay;
      for (let k = 0; k < this.waveform.length; k++) this.waveform[k] *= decay;
      return false;
    }

    // loudness
    analyser.getFloatTimeDomainData(this.timeData);
    let sum = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      sum += this.timeData[i] * this.timeData[i];
    }
    const rms = Math.sqrt(sum / this.timeData.length);
    this.rms = rms;
    this.ref = Math.max(this.ref * perFrame(0.9993, dt), rms, 0.03);
    this.instant = Math.min(1, (rms / this.ref) ** 0.78);
    this.level += (this.instant - this.level) * (1 - perFrame(0.65, dt));

    // Trigger on a rising zero crossing so the trace doesn't jump horizontally.
    let start = 0;
    let slope = 0;
    for (let i = 1; i < 512; i++) {
      const rise = this.timeData[i] - this.timeData[i - 1];
      if (this.timeData[i - 1] <= 0 && this.timeData[i] > 0 && rise > slope) {
        start = i;
        slope = rise;
      }
    }
    const ease = 1 - perFrame(0.7, dt);
    for (let k = 0; k < this.waveform.length; k++) {
      let value = 0;
      for (let j = 0; j < 4; j++) value += this.timeData[start + (k * 4) + j];
      const target = Math.max(-1, Math.min(1, value / (4 * this.ref * 2.5)));
      this.waveform[k] += (target - this.waveform[k]) * ease;
    }

    // bands: RMS-like amplitude from the summed power of each range
    analyser.getFloatFrequencyData(this.freqData);
    const freq = this.freqData;
    for (let k = 0; k < 3; k++) {
      const [a, b] = this.bandBins[k];
      let power = 0;
      for (let j = a; j <= b; j++) power += 10 ** (freq[j] / 10);
      this.bands[k] = Math.sqrt(power);
    }

    // bounce: same curve as the demo, on the 0..1 scale getByteFrequencyData would give
    const minDb = analyser.minDecibels;
    const span = analyser.maxDecibels - minDb;
    const bins = freq.length;
    const decay = perFrame(0.88, dt);
    for (let k = 0; k < BOUNCE_BINS; k++) {
      const a = Math.floor(((k / BOUNCE_BINS) ** 2.2) * bins * 0.7) + 1;
      const b = Math.max(
        a + 1,
        Math.floor((((k + 1) / BOUNCE_BINS) ** 2.2) * bins * 0.7) + 1,
      );
      let m = -Infinity; // dB
      for (let j = a; j < b && j < bins; j++) m = Math.max(m, freq[j]);
      const v = Math.min(1, Math.max(0, (m - minDb) / span)) ** 2.2;
      this.bounce[k] = v > this.bounce[k] ? v : this.bounce[k] * decay;
    }
    return true;
  }
}
