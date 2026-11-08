import { createRenderer } from '@/utils';

import { Waveflow } from './app';
import {
  CLEAR_CACHE_CHANNEL,
  TOGGLE_CHANNEL,
  type WaveflowPluginConfig,
} from './types';

import type { SongInfo } from '@/providers/song-info';
import type { MusicPlayer } from '@/types/music-player';

let app: Waveflow | null = null;
let playerApi: MusicPlayer | null = null;
let ipcBound = false;

// Listeners passed through contextBridge are proxied and can't be removed again,
// so bind once and route to whichever instance is alive.
const bindIpc = () => {
  if (ipcBound) return;
  ipcBound = true;
  window.ipcRenderer.on('peard:update-song-info', (_, info: SongInfo) =>
    app?.onSongInfo(info),
  );
  window.ipcRenderer.on(TOGGLE_CHANNEL, () => app?.toggle());
  window.ipcRenderer.on(CLEAR_CACHE_CHANNEL, () => app?.clearCache());
};

export const renderer = createRenderer<object, WaveflowPluginConfig>({
  async start(ctx) {
    bindIpc();
    app?.destroy();
    app = new Waveflow(ctx, await ctx.getConfig());
    if (playerApi) app.setApi(playerApi);
  },

  onPlayerApiReady(api) {
    playerApi = api;
    app?.setApi(api);
  },

  onConfigChange(config) {
    app?.applyConfig(config);
  },

  stop() {
    app?.destroy();
    app = null;
  },
});
