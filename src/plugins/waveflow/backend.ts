import { getImage } from '@/providers/song-info';
import { createBackend } from '@/utils';

import { COVER_THUMB_CHANNEL, type WaveflowPluginConfig } from './types';

const THUMB_SIZE = 48;

// The renderer runs remote page code, so only fetch cover art from YouTube's image hosts.
const ALLOWED_HOSTS = [
  /(^|\.)ytimg\.com$/,
  /(^|\.)googleusercontent\.com$/,
  /(^|\.)ggpht\.com$/,
];

const isAllowedCover = (src: unknown): src is string => {
  if (typeof src !== 'string') return false;
  try {
    const url = new URL(src);
    return (
      url.protocol === 'https:' &&
      ALLOWED_HOSTS.some((re) => re.test(url.hostname))
    );
  } catch {
    return false;
  }
};

/**
 * Cover images are cross-origin, so reading their pixels in the renderer would taint the canvas.
 * Fetch them here and hand back a tiny same-origin data URL that is only used for colour extraction.
 */
const coverThumb = async (src: unknown): Promise<string | null> => {
  if (!isAllowedCover(src)) return null;
  try {
    const image = await getImage(src);
    if (image.isEmpty()) return null;
    return image
      .resize({ width: THUMB_SIZE, height: THUMB_SIZE, quality: 'good' })
      .toDataURL();
  } catch {
    return null;
  }
};

export const backend = createBackend<object, WaveflowPluginConfig>({
  start(ctx) {
    ctx.ipc.handle(COVER_THUMB_CHANNEL, (src: unknown) => coverThumb(src));
  },
  stop(ctx) {
    ctx.ipc.removeHandler(COVER_THUMB_CHANNEL);
  },
});
