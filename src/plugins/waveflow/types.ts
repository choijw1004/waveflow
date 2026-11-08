// IPC channels (kept here so the renderer never imports backend code).
export const COVER_THUMB_CHANNEL = 'waveflow:cover-thumb';
export const TOGGLE_CHANNEL = 'waveflow:toggle';
export const CLEAR_CACHE_CHANNEL = 'waveflow:clear-cache';

export const STYLES = [
  'classic',
  'ribbon',
  'spectrum',
  'live',
  'dots',
] as const;
export type WaveStyle = (typeof STYLES)[number];

export const ACCENTS = [
  'album',
  'sunset',
  'white',
  'mint',
  'lilac',
  'cherry',
] as const;
export type AccentName = (typeof ACCENTS)[number];

export const MOTIONS = ['off', 'normal', 'strong'] as const;
export type MotionName = (typeof MOTIONS)[number];

export const MOTION_AMOUNT: Record<MotionName, number> = {
  off: 0,
  normal: 1,
  strong: 1.9,
};

export type RGB = [number, number, number];

/** Fixed preset colours. `album` is the fallback until a cover colour is known. */
export const ACCENT_RGB: Record<AccentName, RGB> = {
  album: [255, 106, 31],
  sunset: [255, 106, 31],
  white: [244, 243, 240],
  mint: [84, 226, 190],
  lilac: [176, 150, 255],
  cherry: [255, 66, 96],
};

export const MIN_SPACING = 3;
export const MAX_SPACING = 10;

export type WaveflowPluginConfig = {
  enabled: boolean;
  style: WaveStyle;
  accent: AccentName;
  motion: MotionName;
  /** Pixels per bar (zoom). */
  spacing: number;
  /** Remember waveforms per song in IndexedDB so replays show the whole track. */
  cache: boolean;
};

export const defaultConfig: WaveflowPluginConfig = {
  enabled: false,
  style: 'classic',
  accent: 'album',
  motion: 'normal',
  spacing: 5,
  cache: true,
};
