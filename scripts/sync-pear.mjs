#!/usr/bin/env node
// Copies the plugin and its strings into a Pear Desktop checkout so it can be run
// (`pnpm dev`) and built (`pnpm dist:mac:arm64`) there.
//
// Usage: node scripts/sync-pear.mjs [path-to-pear-desktop]   (default: ../pear-desktop)
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pear = resolve(process.argv[2] ?? join(root, '..', 'pear-desktop'));

if (!existsSync(join(pear, 'src', 'plugins'))) {
  console.error(`Not a Pear Desktop checkout: ${pear}`);
  process.exit(1);
}

const target = join(pear, 'src', 'plugins', 'waveflow');
rmSync(target, { recursive: true, force: true });
cpSync(join(root, 'src', 'plugins', 'waveflow'), target, { recursive: true });

for (const lang of ['en', 'ko']) {
  const file = join(pear, 'src', 'i18n', 'resources', `${lang}.json`);
  const resources = JSON.parse(readFileSync(file, 'utf8'));
  resources.plugins.waveflow = JSON.parse(
    readFileSync(join(root, 'i18n', `${lang}.json`), 'utf8'),
  );
  writeFileSync(file, `${JSON.stringify(resources, null, 2)}\n`);
}

console.log(`Synced Waveflow into ${pear}`);
