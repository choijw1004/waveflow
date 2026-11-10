#!/usr/bin/env node
// UI integration checks. Run from this checkout with `pnpm test:ui`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const { build } = await import(pathToFileURL(require.resolve('vite')));
const { Window } = await import(pathToFileURL(require.resolve('happy-dom')));
const en = JSON.parse(
  readFileSync(join(root, 'src/i18n/resources/en.json'), 'utf8'),
).plugins.waveflow;
const ko = JSON.parse(
  readFileSync(join(root, 'src/i18n/resources/ko.json'), 'utf8'),
).plugins.waveflow;
const plugin = join(root, 'src/plugins/waveflow');

const result = await build({
  configFile: false,
  root,
  logLevel: 'error',
  plugins: [
    {
      name: 'waveflow-ui-check',
      resolveId(id) {
        if (id === join(root, 'waveflow-check.ts')) return '\0waveflow-check';
        if (['@/i18n', '@/providers/song-info-front'].includes(id)) {
          return `\0${id}`;
        }
      },
      load(id) {
        if (id === '\0waveflow-check')
          return `
        export { Waveflow } from ${JSON.stringify(join(plugin, 'app.ts'))};
        export { Overlay } from ${JSON.stringify(join(plugin, 'overlay.ts'))};
        export { MusicNavigation } from ${JSON.stringify(join(plugin, 'navigation.ts'))};
        export { defaultConfig } from ${JSON.stringify(join(plugin, 'types.ts'))};
        export { default as style } from ${JSON.stringify(join(plugin, 'style.css?inline'))};
      `;
        if (id === '\0@/providers/song-info-front')
          return 'export const getSongInfo = () => null;';
        if (id === '\0@/i18n')
          return `
        import i18next from ${JSON.stringify(require.resolve('i18next'))};
        i18next.init({ lng: 'ko', initAsync: false, resources: {
          en: { translation: { plugins: { waveflow: ${JSON.stringify(en)} } } },
          ko: { translation: { plugins: { waveflow: ${JSON.stringify(ko)} } } }
        }});
        export const t = i18next.t.bind(i18next);
      `;
      },
    },
  ],
  build: {
    write: false,
    target: 'esnext',
    minify: false,
    lib: {
      entry: join(root, 'waveflow-check.ts'),
      name: 'WaveflowCheck',
      formats: ['iife'],
    },
  },
});

const window = new Window({
  url: 'https://music.youtube.com/',
  settings: {
    enableJavaScriptEvaluation: true,
    suppressInsecureJavaScriptEnvironmentWarning: true,
  },
});
const output = (Array.isArray(result) ? result[0] : result).output;
window.eval(output.find((item) => item.type === 'chunk').code);
const { Waveflow, Overlay, MusicNavigation, defaultConfig, style } =
  window.WaveflowCheck;
const { document } = window;
let now = 0;
let nextId = 0;
const timers = new Map();
const frames = new Map();
window.setTimeout = (callback, delay) => {
  timers.set(++nextId, { callback, at: now + delay });
  return nextId;
};
window.clearTimeout = (id) => timers.delete(id);
window.setInterval = () => ++nextId;
window.clearInterval = () => {};
window.requestAnimationFrame = (callback) => {
  frames.set(++nextId, callback);
  return nextId;
};
window.cancelAnimationFrame = (id) => frames.delete(id);
window.HTMLCanvasElement.prototype.getContext = () => ({ setTransform() {} });
const advance = (ms) => {
  now += ms;
  for (const [id, timer] of [...timers]) {
    if (timer.at <= now) {
      timers.delete(id);
      timer.callback();
    }
  }
};
const flushFrame = () => {
  const pending = [...frames.values()];
  frames.clear();
  for (const callback of pending) callback(now);
};
const key = (target, value, options = {}) => {
  const event = new window.KeyboardEvent('keydown', {
    key: value,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  target.dispatchEvent(event);
  return event;
};
const handlers = {
  togglePlay() {},
  setStyle() {},
  nextAccent() {},
  nextMotion() {},
  toggleFullscreen() {},
  browse() {},
};

await test('English labels and embedded Pretendard work without host language or font installation', () => {
  const overlay = new Overlay(handlers);
  assert.equal(overlay.root.lang, 'en');
  assert.equal(overlay.root.querySelector('nav button').textContent, 'Search');
  assert.match(style, /data:font\/woff2;base64,/);
  assert.match(style, /font-family:\s*["']Waveflow Pretendard["']/);
  overlay.destroy();
});

await test('cover and controls hide together after 3 seconds, wake on input, stay visible when paused', () => {
  const overlay = new Overlay(handlers);
  overlay.show();
  overlay.setPlaying(true);
  advance(2999);
  assert.equal(overlay.root.classList.contains('wf-idle'), false);
  advance(1);
  assert.equal(overlay.root.classList.contains('wf-idle'), true);
  assert.match(style, /\.waveflow\.wf-idle \.wf-ui\s*\{\s*opacity:\s*0/);
  overlay.root.dispatchEvent(new window.Event('pointermove'));
  assert.equal(overlay.root.classList.contains('wf-idle'), false);
  overlay.setPlaying(false);
  advance(10000);
  assert.equal(overlay.root.classList.contains('wf-idle'), false);
  overlay.setPlaying(true);
  overlay.hide();
  assert.equal(timers.size, 0, 'closing clears the idle timer');
  overlay.destroy();
});

await test('keyboard focus stays within the visualizer', () => {
  const overlay = new Overlay(handlers);
  overlay.show();
  const buttons = [...overlay.root.querySelectorAll('button')];
  key(overlay.root, 'Tab');
  assert.equal(document.activeElement, buttons[0]);
  key(buttons[0], 'Tab', { shiftKey: true });
  assert.equal(document.activeElement, buttons.at(-1));
  key(buttons.at(-1), 'Tab');
  assert.equal(document.activeElement, buttons[0]);
  overlay.destroy();
});

await test('native playlists and search use the current player without page reloads', () => {
  document.body.innerHTML =
    '<ytmusic-app></ytmusic-app><ytmusic-player-page></ytmusic-player-page><button class="player-minimize-button"></button><ytmusic-search-box><input></ytmusic-search-box>';
  const app = document.querySelector('ytmusic-app');
  const playerPage = document.querySelector('ytmusic-player-page');
  const search = document.querySelector('ytmusic-search-box');
  const routes = [];
  let minimized = 0;
  let opened = 0;
  app.navigate = (route) => routes.push(route);
  playerPage.playerPageOpen_ = true;
  document.querySelector('.player-minimize-button').onclick = () => minimized++;
  const navigation = new MusicNavigation(() => opened++);
  navigation.browse('playlists');
  assert.deepEqual(routes, ['FEmusic_liked_playlists']);
  assert.equal(minimized, 1);
  navigation.browse('search');
  flushFrame();
  assert.equal(search.opened, true);
  assert.equal(document.activeElement, search.querySelector('input'));
  assert.equal(window.location.href, 'https://music.youtube.com/');
  navigation.launcher.click();
  assert.equal(opened, 1);
  navigation.destroy();
});

await test('browse, return, typing, fullscreen exit and plugin cleanup work together', async () => {
  const app = new Waveflow(
    { setConfig() {}, ipc: { invoke: async () => null } },
    { ...defaultConfig, cache: false },
  );
  const root = document.querySelector('.waveflow');
  const launcher = document.querySelector('.wf-launcher');
  launcher.click();
  assert.equal(root.hidden, false);
  assert.equal(launcher.hidden, true);
  assert.equal(key(root, '/').defaultPrevented, true);
  assert.equal(root.hidden, true);
  assert.equal(launcher.hidden, false);
  flushFrame();
  const input = document.querySelector('ytmusic-search-box input');
  assert.equal(document.activeElement, input);
  for (const value of ['w', 'p', '/']) {
    assert.equal(key(input, value).defaultPrevented, false);
    assert.equal(root.hidden, true, 'typing must not trigger shortcuts');
  }
  launcher.click();
  let exited = 0;
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => (exited ? null : root),
  });
  document.exitFullscreen = async () => {
    exited++;
  };
  root.querySelectorAll('nav button')[1].click();
  await new Promise(setImmediate);
  assert.equal(exited, 1);
  assert.equal(root.hidden, true);
  key(launcher, 'w');
  assert.equal(root.hidden, false);
  app.destroy();
  assert.equal(document.querySelector('.wf-launcher'), null);
  assert.equal(document.querySelector('.waveflow'), null);
  assert.equal(document.documentElement.classList.contains('wf-open'), false);
  assert.equal(timers.size, 0);
  assert.equal(frames.size, 0);
});

await window.happyDOM.close();
