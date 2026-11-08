import { t } from '@/i18n';
import { getSongInfo } from '@/providers/song-info-front';

import { AudioTap } from './audio';
import { clearWaves, loadWave, saveWave } from './cache';
import { extractCoverColors, type CoverColors } from './color';
import { WaveRenderer } from './draw';
import { Overlay } from './overlay';
import {
  CachedSource,
  LiveHistory,
  Recorder,
  TrackWave,
  sourceFor,
  type WaveRecord,
  type WaveSource,
} from './track';
import {
  ACCENTS,
  ACCENT_RGB,
  COVER_THUMB_CHANNEL,
  MAX_SPACING,
  MIN_SPACING,
  MOTIONS,
  MOTION_AMOUNT,
  STYLES,
  defaultConfig,
  type RGB,
  type WaveflowPluginConfig,
} from './types';

import type { SongInfo } from '@/providers/song-info';
import type { RendererContext } from '@/types/contexts';
import type { MusicPlayer } from '@/types/music-player';

/** Don't read the analyser more often than this (rAF and the background sampler share it). */
const SAMPLE_MIN_MS = 12;
/** Keeps collecting the waveform while the overlay is closed. */
const BACKGROUND_SAMPLE_MS = 20;
const SAVE_EVERY_MS = 10_000;
/** Don't bother caching less than 5 seconds of a song. */
const MIN_SAVE_BARS = 100;
/** Longer than this is treated as a live stream: no per-song waveform. */
const MAX_TRACK_SECONDS = 3 * 60 * 60;
/** After the player starts loading new media, wait for the new song id before recording. */
const LOAD_GRACE_MS = 2500;
/** A first listen switches to the replay layout when the song restarts after this much was heard. */
const PROMOTE_COVERAGE = 0.6;
const SEEK_STEP = 5;
/** How often to retry capturing audio when Pear's audio event hasn't arrived. */
const CAPTURE_RETRY_MS = 3000;

const OUR_KEYS = new Set([
  ' ',
  '1',
  '2',
  '3',
  '4',
  '5',
  'c',
  'C',
  'm',
  'M',
  'f',
  'F',
  'w',
  'W',
  'Escape',
  'ArrowLeft',
  'ArrowRight',
  '+',
  '=',
  '-',
  '_',
]);

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const pick = <T extends string>(list: readonly T[], v: unknown, fallback: T) =>
  list.includes(v as T) ? (v as T) : fallback;

const isEditable = (e: Event) => {
  const target = e.composedPath()[0];
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT')
  );
};

/** Smooths `video.currentTime` (which can advance in steps) into a per-frame playhead. */
class MediaClock {
  t = 0;

  update(actual: number, playing: boolean, rate: number, dt: number) {
    if (!playing) {
      this.t = actual;
      return this.t;
    }
    const predicted = this.t + (dt * rate);
    const err = actual - predicted;
    this.t = Math.abs(err) > 0.25 ? actual : predicted + (err * 0.12);
    return this.t;
  }
}

type Drag = {
  pointerId: number;
  x0: number;
  t0: number;
  t: number;
  pps: number;
  moved: boolean;
};

export class Waveflow {
  private readonly ctx: RendererContext<WaveflowPluginConfig>;
  private config: WaveflowPluginConfig = defaultConfig;
  private readonly overlay: Overlay;
  private readonly painter: WaveRenderer;
  private readonly tap = new AudioTap();
  private readonly live = new LiveHistory();
  private readonly recorder = new Recorder();
  private readonly clock = new MediaClock();

  private api: MusicPlayer | null = null;
  private video: HTMLVideoElement | null = null;
  private unbindVideo: (() => void) | null = null;

  private trackId: string | null = null;
  /** Cached record of the current song; `undefined` while it is still loading. */
  private record: WaveRecord | null | undefined = undefined;
  private loadToken = 0;
  private wave: TrackWave | null = null;
  private source: WaveSource | null = null;
  private recordAfter = 0;
  private captureRetryAt = 0;
  private switchedAt = -Infinity;

  private song: SongInfo | null = null;
  private coverSrc: string | null = null;
  private coverColors: CoverColors | null = null;

  private raf = 0;
  private lastFrame = 0;
  private lastSample = 0;
  private readonly sampler: ReturnType<typeof setInterval>;
  private readonly saver: ReturnType<typeof setInterval>;
  private drag: Drag | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private readonly cleanups: (() => void)[] = [];

  constructor(
    ctx: RendererContext<WaveflowPluginConfig>,
    config: WaveflowPluginConfig,
  ) {
    this.ctx = ctx;
    this.overlay = new Overlay({
      togglePlay: () => this.togglePlay(),
      setStyle: (style) => this.update({ style }),
      nextAccent: () => this.cycle('accent'),
      nextMotion: () => this.cycle('motion'),
      toggleFullscreen: () => this.toggleFullscreen(),
      close: () => this.close(),
    });
    this.painter = new WaveRenderer(this.overlay.canvas);
    this.applyConfig(config);

    this.listen(document, 'peard:audio-can-play', (e) =>
      this.onAudio((e as CustomEvent<Compressor>).detail),
    );
    this.listen(window, 'keydown', (e) => this.onKeyDown(e as KeyboardEvent), {
      capture: true,
    });
    this.listen(window, 'keyup', (e) => this.onKeyUp(e as KeyboardEvent), {
      capture: true,
    });
    this.listen(window, 'resize', () => {
      if (this.overlay.open) this.painter.resize();
    });
    this.listen(document, 'fullscreenchange', () => {
      this.overlay.syncFullscreen();
      if (this.overlay.open) this.painter.resize();
    });
    this.listen(window, 'pagehide', () => this.persist());
    this.listen(document, 'visibilitychange', () => {
      if (document.hidden) this.persist();
    });
    this.bindCanvas();

    const video = document.querySelector('video');
    if (video) this.setVideo(video);
    const song = getSongInfo();
    if (song?.videoId) this.onSongInfo(song);

    this.sampler = setInterval(this.tick, BACKGROUND_SAMPLE_MS);
    this.saver = setInterval(() => this.persist(), SAVE_EVERY_MS);
  }

  destroy() {
    this.close();
    clearInterval(this.sampler);
    clearInterval(this.saver);
    this.persist();
    this.unbindVideo?.();
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups.length = 0;
    this.tap.detach();
    this.overlay.destroy();
  }

  setApi(api: MusicPlayer) {
    this.api = api;
  }

  // ---------- config ----------

  applyConfig(config: WaveflowPluginConfig) {
    this.config = {
      ...config,
      style: pick(STYLES, config.style, defaultConfig.style),
      accent: pick(ACCENTS, config.accent, defaultConfig.accent),
      motion: pick(MOTIONS, config.motion, defaultConfig.motion),
      spacing: clamp(
        Math.round(config.spacing) || defaultConfig.spacing,
        MIN_SPACING,
        MAX_SPACING,
      ),
      cache: config.cache !== false,
    };
    this.overlay.setStyle(this.config.style);
    this.overlay.setMotion(t(`plugins.waveflow.motions.${this.config.motion}`));
    this.applyAccent();
  }

  /** Apply locally right away (no IPC round trip) and persist. */
  private update(patch: Partial<Omit<WaveflowPluginConfig, 'enabled'>>) {
    this.applyConfig({ ...this.config, ...patch });
    this.ctx.setConfig(patch);
  }

  private cycle(key: 'accent' | 'motion') {
    if (key === 'accent') {
      const i = ACCENTS.indexOf(this.config.accent);
      this.update({ accent: ACCENTS[(i + 1) % ACCENTS.length] });
    } else {
      const i = MOTIONS.indexOf(this.config.motion);
      this.update({ motion: MOTIONS[(i + 1) % MOTIONS.length] });
    }
  }

  private accentColor(): RGB {
    if (this.config.accent === 'album') {
      return this.coverColors?.vivid ?? ACCENT_RGB.album;
    }
    return ACCENT_RGB[this.config.accent];
  }

  private applyAccent() {
    this.overlay.setAccent(
      t(`plugins.waveflow.colors.${this.config.accent}`),
      this.accentColor(),
    );
  }

  // ---------- overlay ----------

  toggle() {
    if (this.overlay.open) this.close();
    else this.open();
  }

  open() {
    if (this.overlay.open) return;
    this.overlay.show();
    // hide the page's own scrollbar, which would otherwise sit on top of the overlay
    document.documentElement.classList.add('wf-open');
    this.painter.resize();
    this.painter.snap({ style: this.config.style, source: this.source });
    this.clock.t = this.video?.currentTime ?? 0;
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    this.requestWakeLock();
  }

  close() {
    if (!this.overlay.open) return;
    if (document.fullscreenElement === this.overlay.root) {
      document.exitFullscreen().catch(() => {});
    }
    cancelAnimationFrame(this.raf);
    this.overlay.hide();
    document.documentElement.classList.remove('wf-open');
    this.endDrag(false);
    this.wakeLock?.release().catch(() => {});
    this.wakeLock = null;
  }

  private async toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await this.overlay.root.requestFullscreen();
    } catch {
      // not allowed right now
    }
  }

  private async requestWakeLock() {
    if (this.wakeLock) return;
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (!this.overlay.open) {
        lock.release().catch(() => {});
        return;
      }
      this.wakeLock = lock;
      lock.addEventListener('release', () => {
        if (this.wakeLock === lock) this.wakeLock = null;
      });
    } catch {
      // unsupported or denied
    }
  }

  // ---------- player ----------

  private onAudio(detail: Compressor) {
    this.tap.attach(detail.audioContext, detail.audioSource);
    const media = detail.audioSource.mediaElement;
    if (media instanceof HTMLVideoElement) this.setVideo(media);
  }

  private setVideo(video: HTMLVideoElement) {
    if (this.video === video) return;
    this.unbindVideo?.();
    this.video = video;
    const onLoadStart = () => {
      this.recorder.reset();
      this.live.reset();
      // a captured stream is tied to the old media; Pear's event (or a new capture) takes over
      if (this.tap.attached && !this.tap.shared) this.tap.detach();
      this.captureRetryAt = 0;
      // New media but the song id hasn't changed yet: hold recording until it does (or a
      // timeout passes), so the new song's intro doesn't land in the previous song's waveform.
      const now = performance.now();
      if (now - this.switchedAt > LOAD_GRACE_MS) {
        this.recordAfter = now + LOAD_GRACE_MS;
      }
    };
    video.addEventListener('loadstart', onLoadStart);
    this.unbindVideo = () =>
      video.removeEventListener('loadstart', onLoadStart);
  }

  private isPlaying() {
    const v = this.video;
    return !!v && !v.paused && !v.ended && v.readyState > 2;
  }

  /**
   * Length of the current song. `video.duration` is precise but can still belong to the previous
   * song right after a switch, so it is cross-checked against the song info when that matches.
   */
  private duration() {
    const vd = this.video?.duration;
    const videoD = vd && Number.isFinite(vd) && vd > 0 ? vd : 0;
    const song = this.song;
    const songD =
      song && song.videoId === this.trackId ? song.songDuration || 0 : 0;
    if (songD > 0 && (!videoD || Math.abs(videoD - songD) > 3)) return songD;
    return videoD || songD;
  }

  private currentId() {
    try {
      const id = this.api?.getVideoData()?.video_id;
      if (id) return id;
    } catch {
      // player not ready
    }
    return this.song?.videoId || null;
  }

  private togglePlay() {
    const v = this.video;
    if (!v) return;
    if (v.paused) {
      if (this.api) this.api.playVideo();
      else v.play().catch(() => {});
    } else if (this.api) this.api.pauseVideo();
    else v.pause();
  }

  private seek(time: number) {
    const d = this.duration();
    const target = Math.max(0, d > 0 ? Math.min(d - 0.25, time) : time);
    if (this.api) this.api.seekTo(target);
    else if (this.video) this.video.currentTime = target;
    this.clock.t = target;
    this.recorder.reset();
    this.live.reset();
  }

  onSongInfo(info: SongInfo) {
    this.song = info;
    this.overlay.setTrack({
      title: info.title || '',
      artist: info.artist || '',
      cover: info.imageSrc,
    });
    this.updateSub();
    const src = info.imageSrc || null;
    if (src !== this.coverSrc) this.loadCover(src);
  }

  private async loadCover(src: string | null) {
    this.coverSrc = src;
    let colors: CoverColors | null = null;
    if (src) {
      try {
        const thumb = (await this.ctx.ipc.invoke(COVER_THUMB_CHANNEL, src)) as
          | string
          | null;
        if (thumb) colors = await extractCoverColors(thumb);
      } catch {
        // fall through to a direct read
      }
      colors ??= await extractCoverColors(src);
    }
    if (this.coverSrc !== src) return;
    this.coverColors = colors;
    this.overlay.setGlow(colors?.avg ?? null);
    this.applyAccent();
  }

  // ---------- waveform data ----------

  /** Follows the playing song: saves the old waveform, loads the cached one, builds the new one. */
  private syncTrack() {
    const id = this.currentId();
    if (id && id !== this.trackId) this.switchTrack(id);
    if (!this.trackId || this.record === undefined) return;

    const duration = this.duration();
    if (!(duration > 0) || duration > MAX_TRACK_SECONDS) return;
    if (this.wave && Math.abs(this.wave.duration - duration) <= 2) return;

    // first build for this song, or the duration settled to a different value
    this.wave = new TrackWave(this.trackId, duration, this.record);
    this.source = sourceFor(this.wave);
    this.recorder.reset();
    this.updateSub();
  }

  private switchTrack(id: string) {
    this.persist();
    this.trackId = id;
    this.record = undefined;
    this.wave = null;
    this.source = null;
    this.recordAfter = 0;
    this.switchedAt = performance.now();
    this.recorder.reset();
    this.live.reset();
    this.updateSub();

    const token = ++this.loadToken;
    const ready = (record: WaveRecord | null) => {
      if (token === this.loadToken) this.record = record;
    };
    if (this.config.cache) loadWave(id).then(ready);
    else ready(null);
  }

  /** A first listen that went (nearly) all the way through switches to the whole-track layout on restart. */
  private maybePromote(time: number) {
    if (
      this.source?.kind === 'live' &&
      this.wave &&
      this.wave.coverage >= PROMOTE_COVERAGE &&
      time < 1
    ) {
      this.source = new CachedSource(this.wave);
      this.updateSub();
    }
  }

  private persist() {
    const wave = this.wave;
    if (!wave?.dirty || !this.config.cache || wave.collected < MIN_SAVE_BARS) {
      return;
    }
    wave.dirty = false;
    saveWave(wave.toRecord());
  }

  async clearCache() {
    await clearWaves();
    this.record = this.trackId ? null : undefined;
    if (this.wave) {
      this.wave = new TrackWave(this.wave.id, this.wave.duration);
      this.source = sourceFor(this.wave);
      this.recorder.reset();
    }
    this.updateSub();
  }

  private updateSub() {
    const parts: string[] = [];
    if (this.song?.album) parts.push(this.song.album);
    if (this.source?.kind === 'cached') {
      parts.push(
        t('plugins.waveflow.overlay.source-cached', {
          percent: Math.round(this.source.coverage * 100),
        }),
      );
    } else if (this.source) {
      parts.push(t('plugins.waveflow.overlay.source-live'));
    }
    this.overlay.setSub(parts.join(' · '));
  }

  // ---------- loop ----------

  /** Reads the analyser and records into the current song. Runs from rAF and a background timer. */
  private readonly tick = () => {
    const now = performance.now();
    const elapsed = now - this.lastSample;
    if (elapsed < SAMPLE_MIN_MS) return;
    this.lastSample = now;
    const dt = Math.min(0.1, elapsed / 1000);

    this.syncTrack();
    const playing = this.isPlaying();
    if (!this.tap.attached && playing && this.video && now >= this.captureRetryAt) {
      this.captureRetryAt = now + CAPTURE_RETRY_MS;
      this.tap.attachCapture(this.video);
    }
    if (!this.tap.sample(playing, dt)) return;
    this.live.push(this.tap.instant, dt);

    const v = this.video;
    if (this.wave && v && !v.seeking && now >= this.recordAfter) {
      this.recorder.record(
        this.wave,
        v.currentTime,
        this.tap.rms,
        this.tap.bands,
      );
    }
  };

  private readonly frame = (ts: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.1, Math.max(0, (ts - this.lastFrame) / 1000));
    this.lastFrame = ts;

    this.tick();
    const v = this.video;
    const playing = this.isPlaying();
    const actual = v?.currentTime ?? 0;
    const time = this.drag
      ? this.drag.t
      : this.clock.update(actual, playing, v?.playbackRate || 1, dt);
    this.wave?.tick(dt);
    this.maybePromote(actual);

    this.painter.render(
      {
        t: time,
        source: this.source,
        live: this.live,
        style: this.config.style,
        accent: this.accentColor(),
        spacing: this.config.spacing,
        motion: MOTION_AMOUNT[this.config.motion],
        level: this.tap.level,
        bounce: this.tap.bounce,
        playing,
        emptyText: t('plugins.waveflow.overlay.empty'),
      },
      dt,
    );
    this.overlay.setPlaying(playing);
    this.overlay.setTime(time, this.duration());
    this.overlay.setStatus(
      this.tap.attached ? '' : t('plugins.waveflow.overlay.waiting-audio'),
    );
  };

  // ---------- input ----------

  private consume(e: Event) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey || isEditable(e)) return;
    const k = e.key;

    if (!this.overlay.open) {
      if ((k === 'w' || k === 'W') && !e.repeat) {
        this.consume(e);
        this.open();
      }
      return;
    }

    this.overlay.poke();
    // let a focused button inside the overlay react to Space itself
    const target = e.composedPath()[0];
    if (
      k === ' ' &&
      target instanceof HTMLButtonElement &&
      this.overlay.root.contains(target)
    ) {
      return;
    }
    if (!OUR_KEYS.has(k)) return;
    this.consume(e);

    if (k === ' ') {
      if (!e.repeat) this.togglePlay();
    } else if (k >= '1' && k <= '5')
      this.update({ style: STYLES[Number(k) - 1] });
    else if (k === 'c' || k === 'C') this.cycle('accent');
    else if (k === 'm' || k === 'M') this.cycle('motion');
    else if (k === 'f' || k === 'F') this.toggleFullscreen();
    else if (k === 'w' || k === 'W') this.close();
    else if (k === 'Escape') {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else this.close();
    } else if (k === 'ArrowRight')
      this.seek((this.video?.currentTime ?? 0) + SEEK_STEP);
    else if (k === 'ArrowLeft')
      this.seek((this.video?.currentTime ?? 0) - SEEK_STEP);
    else if (k === '+' || k === '=') {
      this.update({ spacing: Math.min(MAX_SPACING, this.config.spacing + 1) });
    } else if (k === '-' || k === '_') {
      this.update({ spacing: Math.max(MIN_SPACING, this.config.spacing - 1) });
    }
  }

  /** Keep YouTube Music's own shortcuts from also firing while the overlay handles a key. */
  private onKeyUp(e: KeyboardEvent) {
    if (
      !this.overlay.open ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      isEditable(e)
    )
      return;
    if (OUR_KEYS.has(e.key)) e.stopImmediatePropagation();
  }

  /** Drag the waveform to seek; a click while paused resumes. */
  private bindCanvas() {
    const canvas = this.overlay.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const G = this.painter.geometry({
        spacing: this.config.spacing,
        style: this.config.style,
        source: this.source,
      });
      this.drag = {
        pointerId: e.pointerId,
        x0: e.clientX,
        t0: this.clock.t,
        t: this.clock.t,
        pps: G.pps,
        moved: false,
      };
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add('wf-dragging');
    });
    canvas.addEventListener('pointermove', (e) => {
      const drag = this.drag;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const dx = e.clientX - drag.x0;
      if (Math.abs(dx) > 3) drag.moved = true;
      const d = this.duration();
      drag.t = clamp(drag.t0 - (dx / drag.pps), 0, d > 0 ? d : Infinity);
    });
    canvas.addEventListener('pointerup', () => this.endDrag(true));
    canvas.addEventListener('pointercancel', () => this.endDrag(false));
  }

  private endDrag(apply: boolean) {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    this.overlay.canvas.classList.remove('wf-dragging');
    if (!apply) return;
    if (drag.moved) this.seek(drag.t);
    else if (this.video?.paused) this.togglePlay();
  }

  private listen(
    target: EventTarget,
    type: string,
    fn: (e: Event) => void,
    options?: AddEventListenerOptions,
  ) {
    target.addEventListener(type, fn, options);
    this.cleanups.push(() => target.removeEventListener(type, fn, options));
  }
}
