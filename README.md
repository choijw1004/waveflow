# Waveflow

Your music, flowing across the screen. A desktop YouTube Music player with a fullscreen waveform visualizer, built on [Pear Desktop](https://github.com/pear-devs/pear-desktop).

The player, plugin and build tooling live in this repository. A separate checkout and a sync step are no longer needed.

## Development

Requires Node.js 22 or later and pnpm 11 or later.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Enable Waveflow in the app's Plugins menu, then press **W** to open the visualizer.

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm start
pnpm dist:mac:arm64
```

## Source layout

- `src/plugins/waveflow/` — the visualizer plugin.
- `src/i18n/resources/en.json` and `ko.json` — Waveflow strings under `plugins.waveflow`.
- `src/`, `assets/`, `patches/`, `vite-plugins/` — the Pear Desktop host and build tooling.
- `tests/logic.test.ts` — waveform and color checks.
- `waveflow/reference/waveflow-demo.html` — the original visual reference.

Build outputs, dependencies and local backups are ignored by Git.

## Upstream and license

The host source was imported from Pear Desktop commit `3337446b448454125ad261099a25f6b10fbb8cb6` (version 3.12.0). Its MIT license is retained in [license](license).
