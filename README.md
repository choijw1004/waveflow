# Waveflow

Your music, flowing across the screen. A desktop YouTube Music player with a fullscreen waveform visualizer, built on [Pear Desktop](https://github.com/pear-devs/pear-desktop).

The player and Waveflow live in this repository. Run all commands here; a separate Pear Desktop checkout and a sync step are no longer needed.

## Development

Requires Node.js 22 or later and pnpm 11 or later.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Enable Waveflow in the app's Plugins menu. Press **W** or click **Back to Waveflow** to open the visualizer.

- **Search** and **Playlists** open YouTube Music's existing search and library while playback continues.
- **YouTube Music** returns to the current browsing page. **Back to Waveflow** returns to the visualizer.
- The cover, track information and controls fade together after three seconds without input while playing. Move the pointer or use the keyboard to bring them back. Pausing keeps them visible.
- The Waveflow interface uses English and an embedded Pretendard Variable font.

Shortcuts: **Space** play/pause, **1–5** style, **C** color, **M** motion, **F** fullscreen, **/** search, **P** playlists, **W** switch views, **Esc** exit fullscreen/return to YouTube Music, **←/→** seek five seconds, **+/−** zoom. Drag the waveform to seek.

## Checks and builds

```sh
pnpm test          # waveform logic and UI integration checks
pnpm typecheck
pnpm build         # Electron main, preload and renderer bundles
pnpm start         # run the built app
pnpm dist:mac:arm64
```

## Source layout

- `src/plugins/waveflow/` — visualizer, navigation, audio capture, waveform recording and cache.
- `src/i18n/resources/en.json` and `ko.json` — Waveflow strings under `plugins.waveflow`.
- `src/`, `assets/`, `patches/`, `vite-plugins/` — the Pear Desktop host and build tooling.
- `tests/*.test.ts` and `scripts/check-ui.mjs` — waveform, branding and UI checks.
- `waveflow/reference/waveflow-demo.html` — original visual reference.
- `icon/` — supplied app icons; macOS packaging uses `icon/icon.icns`.

Build outputs and installed dependencies are ignored by Git. The previous external checkout is archived locally under `.local/pear-desktop-backup/` after migration and is not needed to run or build this repository.

## Upstream and licenses

The host source was imported from Pear Desktop commit `3337446b448454125ad261099a25f6b10fbb8cb6` (version 3.12.0). Its MIT license is retained in [license](license). The app is named **Waveflow**. Existing installations reuse their previous profile to preserve sign-in, settings and saved waveforms.

[Pretendard](https://github.com/orioncactus/pretendard) v1.3.9 is bundled with its [SIL Open Font License](src/plugins/waveflow/assets/Pretendard-LICENSE.txt).
