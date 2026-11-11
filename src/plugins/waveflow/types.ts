// IPC channels (kept here so the renderer never imports backend code).
export const COVER_THUMB_CHANNEL = 'waveflow:cover-thumb';
export const TOGGLE_CHANNEL = 'waveflow:toggle';
export const CLEAR_CACHE_CHANNEL = 'waveflow:clear-cache';

export const FLUID_STYLES = ['flow', 'scope', 'orbit'] as const;
export type FluidStyle = (typeof FLUID_STYLES)[number];
export const PRIMARY_STYLES = [...FLUID_STYLES, 'vinyl', 'particles'] as const;
export const DOT_STYLES = [
  'particles',
  'constellation',
  'dot-ring',
  'dots',
] as const;
export type ParticleStyle = Exclude<(typeof DOT_STYLES)[number], 'dots'>;

export const STYLES = [
  ...FLUID_STYLES,
  'classic',
  'ribbon',
  'spectrum',
  'live',
  'dots',
  'vinyl',
  'particles',
  'constellation',
  'dot-ring',
] as const;
export type WaveStyle = (typeof STYLES)[number];
/** Keep the existing 1–8 shortcuts; LP is 9, and D cycles dot styles. */
export const STYLE_SHORTCUTS = STYLES.slice(0, 9);

export const isFluidStyle = (style: WaveStyle): style is FluidStyle =>
  (FLUID_STYLES as readonly string[]).includes(style);
export const isParticleStyle = (style: WaveStyle): style is ParticleStyle =>
  style === 'particles' || style === 'constellation' || style === 'dot-ring';
export const isDotStyle = (style: WaveStyle) =>
  (DOT_STYLES as readonly string[]).includes(style);

export const PRIMARY_ACCENTS = [
  'album',
  'aurora',
  'sunset',
  'ocean',
  'rainbow',
] as const;
export const ACCENTS = [
  ...PRIMARY_ACCENTS,
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
  album: [135, 220, 193],
  aurora: [136, 122, 255],
  ocean: [47, 197, 240],
  rainbow: [255, 104, 173],
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
  enabled: true,
  style: 'flow',
  accent: 'album',
  motion: 'normal',
  spacing: 5,
  cache: true,
};
