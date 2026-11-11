import type { AccentName, RGB } from './types';

const PALETTES: Partial<Record<AccentName, RGB[]>> = {
  aurora: [
    [74, 244, 198],
    [52, 182, 255],
    [148, 100, 255],
    [255, 122, 214],
  ],
  sunset: [
    [255, 91, 108],
    [255, 166, 69],
    [255, 213, 124],
    [205, 91, 238],
  ],
  ocean: [
    [41, 126, 255],
    [41, 218, 240],
    [113, 255, 208],
    [83, 113, 246],
  ],
  rainbow: [
    [255, 91, 119],
    [255, 168, 67],
    [255, 229, 107],
    [91, 239, 159],
    [68, 193, 255],
    [158, 115, 255],
    [248, 112, 221],
  ],
};

export const isGradientPalette = (palette?: AccentName) =>
  !!(palette && PALETTES[palette]);

export type PaletteFrame = {
  accent: RGB;
  palette?: AccentName;
  colorPhase?: number;
};

/** Continuous, cyclic interpolation keeps both ends of a travelling palette seamless. */
export function paletteColor(f: PaletteFrame, position = 0): RGB {
  const colors = f.palette && PALETTES[f.palette];
  if (!colors) return f.accent;
  const phase = position + (f.colorPhase ?? 0);
  const x = (((phase % 1) + 1) % 1) * colors.length;
  const i = Math.floor(x);
  const amount = (1 - Math.cos((x - i) * Math.PI)) / 2;
  return colors[i].map((value, channel) =>
    Math.round(
      value + ((colors[(i + 1) % colors.length][channel] - value) * amount),
    ),
  ) as RGB;
}

export function palettePaint(
  g: CanvasRenderingContext2D,
  f: PaletteFrame,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  alpha = 1,
  lift = 0,
): string | CanvasGradient {
  const ink = (position: number) => {
    const color = paletteColor(f, position).map((v) =>
      Math.round(v + ((255 - v) * lift)),
    );
    return `rgba(${color.join(',')},${alpha})`;
  };
  if (!f.palette || !PALETTES[f.palette]) return ink(0);
  const gradient = g.createLinearGradient(x0, y0, x1, y1);
  for (let i = 0; i <= 16; i++) gradient.addColorStop(i / 16, ink(i / 16));
  return gradient;
}

export function palettePreview(palette: AccentName, accent: RGB): string {
  const colors = PALETTES[palette];
  return colors
    ? `linear-gradient(110deg,${colors.map((c) => `rgb(${c.join(',')})`).join(',')})`
    : `rgb(${accent.join(',')})`;
}
