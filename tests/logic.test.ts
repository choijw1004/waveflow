// Run with: node --test tests/
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { liftColor } from '../src/plugins/waveflow/color.ts';
import { paletteColor, palettePreview } from '../src/plugins/waveflow/palette.ts';
import {
  RecordScrub,
  recordGeometry,
} from '../src/plugins/waveflow/record-scrub.ts';
import {
  BAR_RATE,
  LiveHistory,
  Recorder,
  TrackWave,
  sourceFor,
} from '../src/plugins/waveflow/track.ts';

/** Feeds `seconds` of samples at 60 fps, starting at `from`. */
const play = (
  wave: TrackWave,
  rec: Recorder,
  from: number,
  seconds: number,
  rms: (t: number) => number,
) => {
  for (let f = 0; f < seconds * 60; f++) {
    const t = from + f / 60;
    rec.record(wave, t, rms(t), [0.01, 0.002, 0.0005]);
    wave.tick(1 / 60);
  }
};

test('a first listen records the heard part and normalises it', () => {
  const wave = new TrackWave('song', 60);
  assert.equal(wave.length, 60 * BAR_RATE);
  play(wave, new Recorder(), 0, 30, (t) => (t < 15 ? 0.05 : 0.2));
  for (let k = 0; k < 600; k++) wave.tick(1 / 60);

  assert.equal(wave.collected, 600);
  const src = sourceFor(wave);
  assert.equal(src.kind, 'cached', 'half the song heard → whole-track layout');
  assert.ok(src.peak(400) > 0.95, 'loud part reaches the top');
  const quiet = src.peak(100);
  assert.ok(
    quiet > 0.3 && quiet < 0.45,
    `quiet part ≈ 0.25^0.78, got ${quiet}`,
  );
  assert.equal(src.has(700), false, 'unheard bars stay empty');
  assert.equal(src.peak(700), 0);
});

test('a few seconds is a live source and is not stuck at full height', () => {
  const wave = new TrackWave('song', 200);
  play(wave, new Recorder(), 0, 1, () => 0.1);
  assert.equal(wave.collected, BAR_RATE);
  assert.equal(sourceFor(wave).kind, 'live');
  assert.ok(wave.value(0, 5) > 0.9);
});

test('seeking leaves a gap instead of corrupting the timeline', () => {
  const wave = new TrackWave('song', 30);
  const rec = new Recorder();
  play(wave, rec, 0, 5, () => 0.1);
  rec.reset();
  play(wave, rec, 10, 5, () => 0.1);
  assert.equal(wave.has(4 * BAR_RATE), true);
  assert.equal(wave.has(7 * BAR_RATE), false);
  assert.equal(wave.has(12 * BAR_RATE), true);
});

test('records round-trip and reject a different version of the song', () => {
  const wave = new TrackWave('song', 60);
  play(wave, new Recorder(), 0, 30, () => 0.1);
  const record = wave.toRecord();
  assert.equal(new TrackWave('song', 60.4, record).collected, 600);
  assert.equal(new TrackWave('song', 70, record).collected, 0);
});

test('a new pass overwrites a bar, the same pass keeps the max', () => {
  const wave = new TrackWave('song', 10);
  const rec = new Recorder();
  rec.record(wave, 1.0, 0.5, [0, 0, 0]);
  rec.record(wave, 1.01, 0.2, [0, 0, 0]);
  assert.equal(wave.toRecord().peaks[20], 0.5);
  rec.reset();
  rec.record(wave, 1.02, 0.1, [0, 0, 0]);
  assert.ok(Math.abs(wave.toRecord().peaks[20] - 0.1) < 1e-6);
});

test('live history adds BAR_RATE bars per second', () => {
  const live = new LiveHistory();
  for (let i = 0; i < 60; i++) live.push(0.5, 1 / 60);
  assert.ok(
    live.values.length >= BAR_RATE - 1 && live.values.length <= BAR_RATE,
  );
});

test('cover colours are lifted for a dark background', () => {
  assert.deepEqual(
    liftColor([128, 128, 128]),
    [236, 234, 230],
    'grey → off-white',
  );
  const red = liftColor([200, 40, 40]);
  assert.ok(red[0] > red[1] && red[0] > red[2]);
});

test('flowing palettes vary across space and time, wrap seamlessly and preserve album colors', () => {
  const accent: [number, number, number] = [135, 220, 193];
  for (const palette of ['aurora', 'sunset', 'ocean', 'rainbow'] as const) {
    const frame = { palette, accent, colorPhase: 0 };
    assert.notDeepEqual(paletteColor(frame, 0), paletteColor(frame, 0.4));
    assert.notDeepEqual(paletteColor(frame), paletteColor({ ...frame, colorPhase: 0.4 }));
    assert.deepEqual(paletteColor(frame), paletteColor({ ...frame, colorPhase: 1 }));
    assert.match(palettePreview(palette, accent), /^linear-gradient/);
    for (const position of [-0.25, 0, 0.3, 1, 5]) {
      assert.ok(paletteColor(frame, position).every(channel => channel >= 0 && channel <= 255));
    }
  }
  assert.deepEqual(paletteColor({ accent, palette: 'album', colorPhase: 0.7 }), accent);
});

test('vinyl scrubbing unwraps ±π and supports several revolutions in both directions', () => {
  const start = (170 * Math.PI) / 180;
  const scrub = new RecordScrub(start, 90, 0.7, 240);
  for (let i = 1; i <= 16; i++) {
    const angle = start + (i * Math.PI) / 4;
    scrub.move(Math.atan2(Math.sin(angle), Math.cos(angle)));
  }
  assert.ok(
    Math.abs(scrub.time - 150) < 1e-8,
    'two clockwise turns advance 60 seconds',
  );
  assert.ok(Math.abs(scrub.rotation - (0.7 + Math.PI * 4)) < 1e-8);
  for (let i = 15; i >= 0; i--) {
    const angle = start + (i * Math.PI) / 4;
    scrub.move(Math.atan2(Math.sin(angle), Math.cos(angle)));
  }
  assert.ok(Math.abs(scrub.time - 90) < 1e-8);
  assert.equal(scrub.moved, true);
});

test('vinyl seeking clamps to track boundaries and reverses immediately after a limit', () => {
  const scrub = new RecordScrub(0, 99, 0, 100);
  scrub.move(Math.PI / 2);
  assert.equal(scrub.time, 99.75);
  scrub.move(0);
  assert.equal(
    scrub.time,
    92.25,
    'reverse movement is not consumed by overshoot',
  );
  const intro = new RecordScrub(0, 1, 0, 100);
  intro.move(-Math.PI / 2);
  assert.equal(intro.time, 0);
  intro.move(0);
  assert.equal(intro.time, 7.5);
  const small = recordGeometry(390, 844);
  assert.ok(small.cx - small.radius > 0 && small.cx + small.radius < 390);
  assert.ok(
    small.exposedX > small.cx && small.exposedX < small.cx + small.radius,
    'the square sleeve covers the left half of the record',
  );
  const reanchored = new RecordScrub(0, 50, 0, 100);
  reanchored.reanchor(Math.PI);
  assert.equal(
    reanchored.time,
    50,
    'crossing the spindle does not invent half a revolution',
  );
  reanchored.move(Math.PI + Math.PI / 2);
  assert.equal(reanchored.time, 57.5);
});
