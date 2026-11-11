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
        export { AudioTap } from ${JSON.stringify(join(plugin, 'audio.ts'))};
        export { WaveRenderer } from ${JSON.stringify(join(plugin, 'draw.ts'))};
        export { AudioDynamics } from ${JSON.stringify(join(plugin, 'dynamics.ts'))};
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
const {
  Waveflow,
  AudioTap,
  AudioDynamics,
  WaveRenderer,
  Overlay,
  MusicNavigation,
  defaultConfig,
  style,
} = window.WaveflowCheck;
const { document } = window;
let now = 0;
window.performance.now = () => now;
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
  setAccent() {},
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

await test('Waveflow opens by default before playback and supports browsing, returning and cleanup', async () => {
  assert.equal(defaultConfig.enabled, true);
  const app = new Waveflow(
    { setConfig() {}, ipc: { invoke: async () => null } },
    { ...defaultConfig, cache: false },
  );
  const root = document.querySelector('.waveflow');
  const launcher = document.querySelector('.wf-launcher');
  assert.equal(root.hidden, false);
  assert.equal(launcher.hidden, true);
  assert.equal(document.documentElement.classList.contains('wf-open'), true);
  assert.equal(document.activeElement, root);
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

await test('gapless song changes render and record on the current song timeline', () => {
  document.body.innerHTML = '<video></video>';
  const video = document.querySelector('video');
  let mediaTime = 658.361179;
  let paused = true;
  Object.defineProperties(video, {
    currentTime: { configurable: true, get: () => mediaTime },
    duration: { configurable: true, get: () => 784.579567 },
    paused: { configurable: true, get: () => paused },
    readyState: { configurable: true, get: () => 4 },
  });
  let trackId = 'first-song';
  let trackTime = 3.544875;
  const seeks = [];
  const app = new Waveflow(
    { setConfig() {}, ipc: { invoke: async () => null } },
    { ...defaultConfig, cache: false },
  );
  let rendered;
  app.painter.render = (frame) => {
    rendered = frame;
  };
  app.tap.attachCapture = () => true;
  app.tap.sample = () => {
    app.tap.rms = 0.1;
    app.tap.bands.fill(0.01);
    return !paused;
  };
  app.setApi({
    getVideoData: () => ({ video_id: trackId }),
    getCurrentTime: () => trackTime,
    seekTo: (time) => {
      seeks.push(time);
      trackTime = time;
    },
  });
  const root = document.querySelector('.waveflow');
  const step = () => {
    advance(20);
    flushFrame();
  };
  try {
    app.onSongInfo({ videoId: trackId, title: 'First', songDuration: 190 });
    step();
    assert.equal(root.querySelector('.wf-cur').textContent, '0:03');
    assert.equal(root.querySelector('.wf-dur').textContent, '3:10');
    assert.equal(rendered.t, trackTime);
    paused = false;
    step();
    assert.equal(
      rendered.source.has(Math.floor(trackTime * 20)),
      true,
      'audio must be recorded within the song, not at media time 658s',
    );

    trackId = 'next-song';
    trackTime = 0.25;
    mediaTime = 846.25;
    app.onSongInfo({ videoId: trackId, title: 'Next', songDuration: 106 });
    step();
    assert.equal(root.querySelector('.wf-title').textContent, 'Next');
    assert.equal(root.querySelector('.wf-cur').textContent, '0:00');
    assert.equal(root.querySelector('.wf-dur').textContent, '1:46');
    assert.equal(
      rendered.source.has(5),
      true,
      'the next song waveform starts at its own intro',
    );
    assert.equal(
      rendered.source.has(70),
      false,
      'the previous song waveform must not carry over',
    );

    paused = true;
    trackTime = 3.5;
    step();
    key(root, 'ArrowRight');
    key(root, 'ArrowLeft');
    assert.deepEqual(seeks, [8.5, 3.5]);
    app.close();
    app.open();
    step();
    assert.equal(
      rendered.t,
      3.5,
      'returning to Waveflow uses the song timeline',
    );

    mediaTime = 12;
    trackTime = NaN;
    step();
    assert.equal(
      root.querySelector('.wf-cur').textContent,
      '0:12',
      'an unavailable player time falls back to the media element',
    );
  } finally {
    app.destroy();
  }
});

await test('fluid modes, legacy styles and keyboard navigation select and persist the right mode', () => {
  document.body.innerHTML = '';
  const changes = [];
  const seeks = [];
  const app = new Waveflow(
    {
      setConfig: (patch) => changes.push(patch),
      ipc: { invoke: async () => null },
    },
    { ...defaultConfig, cache: false },
  );
  app.setApi({ seekTo: (time) => seeks.push(time) });
  const root = document.querySelector('.waveflow');
  try {
    assert.equal(defaultConfig.style, 'flow');
    const modes = [
      'flow',
      'scope',
      'orbit',
      'classic',
      'ribbon',
      'spectrum',
      'live',
      'dots',
      'vinyl',
    ];
    for (let i = 0; i < modes.length; i++) {
      assert.equal(key(root, String(i + 1)).defaultPrevented, true);
      assert.equal(root.dataset.style, modes[i]);
      assert.equal(changes.at(-1).style, modes[i]);
    }
    key(root, '2');
    const radios = [...root.querySelectorAll('[role="radio"]')];
    assert.equal(radios[1].getAttribute('aria-checked'), 'true');
    assert.equal(radios[1].tabIndex, 0);
    key(radios[1], 'ArrowRight');
    assert.equal(root.dataset.style, 'orbit');
    assert.equal(document.activeElement, radios[2]);
    assert.deepEqual(seeks, [], 'style arrow keys must not seek the song');
    key(radios[2], 'ArrowRight');
    assert.equal(root.dataset.style, 'vinyl');
    assert.equal(radios.length, 5, 'five main styles stay directly accessible');
    key(radios[3], 'ArrowRight');
    assert.equal(root.dataset.style, 'particles');
    key(radios[4], 'ArrowRight');
    assert.equal(root.dataset.style, 'flow', 'style navigation wraps');
    const select = root.querySelector('.wf-other-styles');
    select.value = 'ribbon';
    select.dispatchEvent(new window.Event('change'));
    assert.equal(root.dataset.style, 'ribbon');
    assert.equal(select.classList.contains('wf-selected'), true);
    key(root, '1');
    assert.equal(select.value, '');
    assert.equal(select.classList.contains('wf-selected'), false);
    for (const mode of ['particles', 'constellation', 'dot-ring', 'dots']) {
      key(root, 'd');
      assert.equal(root.dataset.style, mode);
      assert.equal(changes.at(-1).style, mode);
      assert.equal(root.querySelector('.wf-dot-styles').value, mode);
    }
    const palette = root.querySelector('.wf-color-select');
    assert.equal(palette.querySelectorAll(':scope > option').length, 5);
    for (const accent of ['album', 'aurora', 'sunset', 'ocean', 'rainbow', 'mint']) {
      palette.value = accent;
      palette.dispatchEvent(new window.Event('change'));
      assert.equal(changes.at(-1).accent, accent);
      assert.equal(root.dataset.palette, accent);
    }
    key(root, 'c');
    assert.equal(palette.value, 'lilac', 'the color shortcut keeps legacy colors available');
    key(root, 'v');
    assert.equal(root.dataset.style, 'vinyl');
    assert.equal(root.querySelector('canvas').getAttribute('role'), 'slider');
    key(root, '1');
    assert.equal(root.querySelector('canvas').hasAttribute('role'), false);
    assert.ok(
      !root.textContent.includes('plugins.waveflow.'),
      'all new labels resolve',
    );
  } finally {
    app.destroy();
  }
});

await test('scope uses bounded audio samples, aligns its trace and decays during pause', () => {
  let connected = 0;
  const analyser = {
    fftSize: 2048,
    frequencyBinCount: 1024,
    minDecibels: -100,
    maxDecibels: -30,
    getFloatTimeDomainData(data) {
      for (let i = 0; i < data.length; i++)
        data[i] = Math.sin((i * Math.PI) / 32) * 0.1;
    },
    getFloatFrequencyData(data) {
      data.fill(-45);
    },
  };
  const tap = new AudioTap();
  tap.attach(
    { sampleRate: 44100, createAnalyser: () => analyser },
    {
      connect() {
        connected++;
      },
      disconnect() {},
    },
  );
  tap.sample(true, 1 / 60);
  assert.equal(connected, 1);
  assert.equal(tap.waveform.length, 256);
  assert.ok(
    [...tap.waveform].every(
      (value) => Number.isFinite(value) && Math.abs(value) <= 1,
    ),
  );
  const amplitude = Math.max(...tap.waveform.map(Math.abs));
  assert.ok(amplitude > 0.05, 'the scope receives the real time-domain signal');
  tap.sample(false, 1);
  assert.ok(Math.max(...tap.waveform.map(Math.abs)) < amplitude * 0.01);
  tap.detach();
});

await test('fluid, vinyl and particle modes render without history, in silence and on compact canvases', () => {
  const finite = (...values) =>
    assert.ok(
      values.every(Number.isFinite),
      'canvas coordinates must stay finite',
    );
  class CheckedPath {
    moveTo(...values) {
      finite(...values);
    }
    lineTo(...values) {
      finite(...values);
    }
    quadraticCurveTo(...values) {
      finite(...values);
    }
    arc(...values) {
      finite(...values);
    }
    closePath() {}
  }
  window.Path2D = CheckedPath;
  let strokes = 0;
  const gradient = () => ({
    addColorStop(offset) {
      assert.ok(offset >= 0 && offset <= 1);
    },
  });
  const context = {
    setTransform() {},
    clearRect: finite,
    fillRect: finite,
    save() {},
    restore() {},
    beginPath() {},
    clip() {},
    fill() {
      strokes++;
    },
    fillText() {},
    rect: finite,
    strokeRect: finite,
    translate: finite,
    rotate: finite,
    drawImage() {},
    arc: finite,
    moveTo: finite,
    lineTo: finite,
    stroke() {
      strokes++;
    },
    createLinearGradient: gradient,
    createRadialGradient: gradient,
  };
  const original = window.HTMLCanvasElement.prototype.getContext;
  window.HTMLCanvasElement.prototype.getContext = () => context;
  try {
    for (const width of [1, 390, 1440]) {
      const canvas = document.createElement('canvas');
      Object.defineProperties(canvas, {
        clientWidth: { value: width },
        clientHeight: { value: 844 },
      });
      const painter = new WaveRenderer(canvas);
      painter.resize();
      for (const mode of [
        'flow',
        'scope',
        'orbit',
        'vinyl',
        'particles',
        'constellation',
        'dot-ring',
      ]) {
        for (const playing of [false, true]) {
          const before = strokes;
          painter.render(
            {
              t: 0,
              source: null,
              live: { values: [], acc: 0 },
              style: mode,
              accent: [135, 220, 193],
              palette: playing ? 'rainbow' : 'aurora',
              spacing: 5,
              motion: playing ? 1 : 0,
              level: playing ? 1 : 0,
              bounce: new Float32Array(72).fill(playing ? 1 : 0),
              waveform: new Float32Array(256).fill(playing ? 0.5 : 0),
              playing,
              emptyText: 'Play a song',
            },
            1 / 60,
          );
          assert.ok(
            strokes > before,
            `${mode} should draw without cached audio`,
          );
        }
      }
    }
  } finally {
    window.HTMLCanvasElement.prototype.getContext = original;
  }
});

await test('bass transients pulse, sustained audio settles, and Motion Off stops decorative travel', () => {
  const audio = new AudioDynamics();
  const frame = {
    level: 0.8,
    bounce: new Float32Array(72).fill(0.8),
    playing: true,
    motion: 1,
  };
  audio.update(frame, 1 / 60);
  assert.ok(
    audio.pulse > 0.5,
    'a rising bass transient produces a visible impulse',
  );
  for (let i = 0; i < 180; i++) audio.update(frame, 1 / 60);
  assert.ok(
    audio.pulse < 0.01,
    'constant loudness does not pretend to be a beat',
  );
  const phase = audio.phase;
  audio.update({ ...frame, motion: 0 }, 0.1);
  assert.equal(audio.phase, phase);
  audio.update(
    { ...frame, playing: false, bounce: new Float32Array(72), level: 0 },
    0.1,
  );
  assert.equal(audio.phase, phase, 'pause freezes decorative motion');
});

await test('turning the LP seeks live, throttles the player, commits on release and cleans up capture', () => {
  document.body.innerHTML = '<video></video>';
  const video = document.querySelector('video');
  Object.defineProperties(video, {
    duration: { get: () => 240 },
    paused: { get: () => false },
    readyState: { get: () => 4 },
  });
  let trackTime = 90;
  let playChanges = 0;
  const seeks = [];
  const app = new Waveflow(
    { setConfig() {}, ipc: { invoke: async () => null } },
    { ...defaultConfig, style: 'vinyl', cache: false },
  );
  app.setApi({
    getCurrentTime: () => trackTime,
    seekTo: (time) => {
      trackTime = time;
      seeks.push(time);
    },
    playVideo: () => playChanges++,
    pauseVideo: () => playChanges++,
  });
  const root = document.querySelector('.waveflow');
  const canvas = root.querySelector('canvas');
  const captured = new Set();
  canvas.setPointerCapture = (id) => captured.add(id);
  canvas.hasPointerCapture = (id) => captured.has(id);
  canvas.releasePointerCapture = (id) => captured.delete(id);
  Object.defineProperties(canvas, {
    clientWidth: { value: 1000 },
    clientHeight: { value: 800 },
  });
  app.painter.resize();
  const { cx, cy, radius } = app.painter.recordGeometry();
  const pointer = (type, angle, id = 1, distance = radius * 0.7) =>
    canvas.dispatchEvent(
      new window.PointerEvent(type, {
        pointerId: id,
        button: 0,
        bubbles: true,
        cancelable: true,
        clientX: cx + Math.cos(angle) * distance,
        clientY: cy + Math.sin(angle) * distance,
      }),
    );
  try {
    pointer('pointerdown', 0, 1, radius * 1.4);
    assert.equal(app.drag, null, 'the background is not a record gesture');
    pointer('pointerdown', Math.PI);
    assert.equal(
      app.drag,
      null,
      'the sleeve occludes the record and is not a turntable target',
    );
    pointer('pointerdown', 0);
    assert.equal(root.classList.contains('wf-scrubbing'), true);
    assert.equal(captured.has(1), true);
    pointer('pointermove', Math.PI / 2, 2);
    assert.deepEqual(
      seeks,
      [],
      'another finger must not take over the platter',
    );
    pointer('pointermove', Math.PI / 2);
    assert.ok(Math.abs(seeks[0] - 97.5) < 1e-8);
    pointer('pointermove', Math.PI);
    assert.equal(
      seeks.length,
      1,
      'rapid pointer input does not flood the player API',
    );
    assert.equal(root.querySelector('.wf-cur').textContent, '1:45');
    pointer('pointerup', Math.PI);
    assert.ok(Math.abs(seeks.at(-1) - 105) < 1e-8);
    assert.equal(captured.size, 0);
    assert.equal(root.classList.contains('wf-scrubbing'), false);
    assert.equal(playChanges, 0, 'scrubbing preserves the playback state');
    pointer('pointerdown', 0);
    advance(100);
    pointer('pointermove', -Math.PI / 2);
    pointer('pointercancel', -Math.PI / 2);
    assert.equal(app.drag, null);
    assert.equal(captured.size, 0);
    pointer('pointerdown', 0);
    key(root, '1');
    assert.equal(app.drag, null, 'switching styles releases the platter');
    assert.equal(captured.size, 0);
  } finally {
    app.destroy();
  }
});

await window.happyDOM.close();
