import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { APPLICATION_ID, APPLICATION_NAME, windowTitle } from '../src/brand.ts';

test('the app and installation metadata consistently identify Waveflow', () => {
  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  );
  const builder = readFileSync(
    new URL('../electron-builder.yml', import.meta.url),
    'utf8',
  );
  assert.equal(pkg.name, 'waveflow');
  assert.equal(pkg.productName, APPLICATION_NAME);
  assert.equal(pkg.desktopName, APPLICATION_ID);
  assert.match(builder, /^productName: Waveflow$/m);
  assert.match(builder, /^appId: com\.choijw1004\.waveflow$/m);
});

test('window titles show Waveflow and preserve the current track', () => {
  assert.equal(windowTitle('YouTube Music'), 'Waveflow');
  assert.equal(
    windowTitle('Song title | YouTube Music'),
    'Song title | Waveflow',
  );
  assert.equal(windowTitle('Waveflow'), 'Waveflow');
  assert.equal(
    windowTitle('YouTube Music Live Session | YouTube Music'),
    'YouTube Music Live Session | Waveflow',
  );
});
