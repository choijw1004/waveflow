import type { RGB } from './types';

export type CoverColors = {
  /** Average colour of the cover, used for the background glow. */
  avg: RGB;
  /** A bright, saturated colour from the cover that reads well on black. */
  vivid: RGB;
};

/** Push a cover colour into a bright, saturated range. Near-grey covers become off-white. */
export const liftColor = ([r, g, b]: RGB): RGB => {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = ((g - b) / d) + (g < b ? 6 : 0);
    else if (mx === g) h = ((b - r) / d) + 2;
    else h = ((r - g) / d) + 4;
    h /= 6;
  }
  if (s < 0.12) return [236, 234, 230];
  s = Math.max(s, 0.62);
  l = Math.min(0.7, Math.max(0.56, l));
  const q = l < 0.5 ? l * (1 + s) : l + s - (l * s);
  const p = (2 * l) - q;
  const f = (t: number) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + ((q - p) * 6 * t);
    if (t < 0.5) return q;
    if (t < 2 / 3) return p + ((q - p) * ((2 / 3) - t) * 6);
    return p;
  };
  return [f(h + (1 / 3)), f(h), f(h - (1 / 3))].map((v) =>
    Math.round(v * 255),
  ) as RGB;
};

const loadImage = (url: string, crossOrigin: boolean) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });

/**
 * Average colour plus the mean of the most saturated ~12% of pixels, lifted for a dark background.
 * Returns null when the image can't be read (e.g. a tainted cross-origin canvas).
 */
export const extractCoverColors = async (
  url: string,
): Promise<CoverColors | null> => {
  const img = await loadImage(url, !url.startsWith('data:'));
  if (!img) return null;
  try {
    const S = 24;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = S;
    const x = canvas.getContext('2d', { willReadFrequently: true });
    if (!x) return null;
    x.drawImage(img, 0, 0, S, S);
    const d = x.getImageData(0, 0, S, S).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    const px: { c: RGB; score: number }[] = [];
    for (let i = 0; i < d.length; i += 4) {
      const R = d[i];
      const G = d[i + 1];
      const B = d[i + 2];
      const mx = Math.max(R, G, B);
      const mn = Math.min(R, G, B);
      if (mx + mn > 60) {
        r += R;
        g += G;
        b += B;
        n++;
      }
      const sat = mx ? (mx - mn) / mx : 0;
      px.push({ c: [R, G, B], score: sat * sat * (mx / 255) });
    }
    if (!n) return null;
    px.sort((p, q) => q.score - p.score);
    const top = px.slice(0, Math.max(4, Math.floor(px.length * 0.12)));
    const vivid = [0, 1, 2].map(
      (k) => top.reduce((sum, p) => sum + p.c[k], 0) / top.length,
    ) as RGB;
    return {
      avg: [Math.round(r / n), Math.round(g / n), Math.round(b / n)],
      vivid: liftColor(vivid),
    };
  } catch {
    return null;
  }
};
