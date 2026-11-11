#!/usr/bin/env node
// Capture the real renderer and controls with deterministic demo audio, without a user account.
import { build } from 'vite';
import { chromium } from '@playwright/test';
import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const plugin = join(root, 'src/plugins/waveflow');
const destination = join(root, 'docs/screenshots');
const labels = JSON.parse(await readFile(join(root, 'src/i18n/resources/en.json'), 'utf8'));
const result = await build({
  root, configFile: false, logLevel: 'error',
  plugins: [{
    name: 'waveflow-feature-captures',
    resolveId(id) {
      if (id === join(root, 'capture-entry.ts')) return '\0capture-entry';
      if (id === '@/i18n') return '\0capture-i18n';
    },
    load(id) {
      if (id === '\0capture-i18n') return `
        const labels = ${JSON.stringify(labels)};
        export const t = (key, values = {}) => {
          let text = key.split('.').reduce((value, part) => value?.[part], labels) ?? key;
          for (const [name, value] of Object.entries(values)) text = text.replaceAll('{{' + name + '}}', String(value));
          return text;
        };
      `;
      if (id === '\0capture-entry') return `
        export { Overlay } from ${JSON.stringify(join(plugin, 'overlay.ts'))};
        export { WaveRenderer } from ${JSON.stringify(join(plugin, 'draw.ts'))};
        export { TrackWave, LiveHistory, Recorder, sourceFor } from ${JSON.stringify(join(plugin, 'track.ts'))};
        export { ACCENT_RGB } from ${JSON.stringify(join(plugin, 'types.ts'))};
        export { default as css } from ${JSON.stringify(join(plugin, 'style.css?inline'))};
      `;
    },
  }],
  build: { write: false, minify: false, target: 'esnext', lib: {
    entry: join(root, 'capture-entry.ts'), name: 'WaveflowPreview', formats: ['iife'],
  } },
});
const bundle = (Array.isArray(result) ? result[0] : result).output.find(item => item.type === 'chunk').code;
const temporary = await mkdtemp(join(tmpdir(), 'waveflow-captures-'));
await mkdir(destination, { recursive: true });
await writeFile(join(temporary, 'preview.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><title>Waveflow feature preview</title><body><script>${bundle}</script><script>
const { Overlay, WaveRenderer, TrackWave, LiveHistory, Recorder, sourceFor, ACCENT_RGB, css } = WaveflowPreview;
document.head.append(Object.assign(document.createElement('style'), {textContent: css}));
const cover = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><defs><linearGradient id="c" x2="1" y2="1"><stop stop-color="#64eacb"/><stop offset=".5" stop-color="#6676f4"/><stop offset="1" stop-color="#f09ecd"/></linearGradient></defs><rect width="240" height="240" fill="#131922"/><g fill="none" stroke="url(#c)" stroke-width="2">' + Array.from({length:12},(_,i)=>'<ellipse cx="120" cy="120" rx="'+(30+i*7)+'" ry="'+(15+i*7)+'" transform="rotate('+(i*8)+' 120 120)"/>').join('')+'</g></svg>';
const overlay = new Overlay({togglePlay(){},setStyle(style){capture(style,currentPalette)},setAccent(palette){capture(currentStyle,palette)},nextMotion(){},toggleFullscreen(){},browse(){}});
overlay.root.classList.add('wf-mac');
// Freeze the demo chrome so screenshots are reproducible while DevTools has focus.
overlay.poke = () => {};
overlay.setTrack({title:'A little sound, a little sea',artist:'Waveflow · visual demo',cover:'data:image/svg+xml,'+encodeURIComponent(cover)});
overlay.show();
overlay.setMotion('Strong');
const painter = new WaveRenderer(overlay.canvas);
const wave = new TrackWave('preview',240);
const recorder = new Recorder();
const live = new LiveHistory();
for(let i=0;i<240*60;i++) {
  const time=i/60;
  const rms=0.04+0.11*(0.5+0.5*Math.sin(time*1.5))*Math.pow(0.5+0.5*Math.cos(time*5),2);
  recorder.record(wave,time,rms,[rms*0.7,rms*0.4,rms*0.25]);
  wave.tick(1/60);
  live.push(Math.min(1,rms*5),1/60);
}
const source=sourceFor(wave);
let currentStyle='flow',currentPalette='aurora';
window.capture = (style='flow',palette='aurora',immersive=false,scrubbing=false,phase=0) => {
  currentStyle=style;currentPalette=palette;
  overlay.setStyle(style);
  overlay.setAccent(palette[0].toUpperCase()+palette.slice(1),ACCENT_RGB[palette],palette);
  overlay.setSub('Saved waveform · 100% collected');
  overlay.setGlow(ACCENT_RGB[palette]);
  overlay.setPlaying(true);
  overlay.setScrubbing(scrubbing);
  overlay.setTime(83,240);
  overlay.root.classList.toggle('wf-idle',immersive);
  painter.resize();
  for(let frame=0;frame<100;frame++) {
    const time=frame/60+phase;
    const beat=Math.pow(Math.max(0,Math.cos(time*6.8)),8);
    const bounce=Float32Array.from({length:72},(_,i)=>Math.max(0,Math.min(1,(0.4+0.32*Math.sin(i*0.16+time*2)+beat*0.3)*Math.exp(-i/100))));
    const waveform=Float32Array.from({length:256},(_,i)=>(Math.sin(i*0.11+time*0.6)*0.6+Math.sin(i*0.031)*0.22)*Math.sin(Math.PI*i/255));
    painter.render({t:83,source,live,style,palette,accent:ACCENT_RGB[palette],spacing:5,motion:1.9,level:0.72+beat*0.2,bounce,waveform,playing:true,emptyText:'',duration:240,scrubbing,recordHint:scrubbing?'SCRUBBING':'TURN TO SEEK'},1/60);
  }
  clearTimeout(overlay.idleTimer);
};
const params = new URLSearchParams(location.search);
window.capture(params.get('style') || 'flow', params.get('palette') || 'aurora', params.has('immersive'), params.has('scrubbing'));
</script></body></html>`);

if (process.argv.includes('--preview-only')) {
  const preview = '/private/tmp/waveflow-feature-preview.html';
  await writeFile(preview, await readFile(join(temporary, 'preview.html')));
  await rm(temporary, { recursive: true, force: true });
  console.log(preview);
  process.exit(0);
}

let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(join(temporary, 'preview.html')).href);
  await page.evaluate(() => document.fonts.ready);
  const captures = [
    ...['flow', 'scope', 'orbit', 'vinyl', 'particles', 'constellation', 'dot-ring', 'classic', 'ribbon', 'spectrum', 'live', 'dots'].map(style => ({ name: style, style, palette: style === 'vinyl' ? 'sunset' : 'aurora' })),
    ...['album', 'sunset', 'ocean', 'rainbow'].map(palette => ({ name: 'color-' + palette, style: 'flow', palette })),
    { name: 'immersive', style: 'orbit', palette: 'rainbow', immersive: true },
    { name: 'vinyl-scrubbing', style: 'vinyl', palette: 'rainbow', scrubbing: true },
  ];
  for (const capture of captures) {
    await page.evaluate(({style,palette,immersive,scrubbing}) => window.capture(style,palette,immersive,scrubbing), capture);
    await page.screenshot({ path: join(destination, capture.name + '.jpg'), type: 'jpeg', quality: 88 });
  }
  // Check the same controls at a narrow window before shipping the desktop app.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.capture('flow', 'rainbow'));
  await page.screenshot({ path: join(destination, 'compact.jpg'), type: 'jpeg', quality: 88 });
  const clipped = await page.locator('.wf-dock button, .wf-dock select, .wf-navigation button').evaluateAll(nodes => nodes.filter(node => { const r = node.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth || r.bottom > innerHeight; }).map(node => node.textContent));
  if (clipped.length) throw new Error('Controls outside compact viewport: ' + clipped.join(', '));
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Captured ' + (captures.length + 1) + ' Waveflow feature screenshots in docs/screenshots.');
} finally {
  await browser?.close();
  await rm(temporary, { recursive: true, force: true });
}
