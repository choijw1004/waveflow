<p align="center">
  <img src="icon/banner.svg" alt="Waveflow — your music, flowing across the screen" width="100%" />
</p>

<p align="center">
  <strong>Your music, flowing across the screen.</strong><br />
  A desktop YouTube Music player with a fullscreen waveform visualizer.
</p>

<p align="center">
  <strong>English</strong> · <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  <a href="license"><img src="https://img.shields.io/badge/license-MIT-E53935?style=flat-square" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/macOS-Apple%20Silicon-171717?style=flat-square&amp;logo=apple&amp;logoColor=white" alt="Tested on macOS with Apple Silicon" />
  <a href="https://www.electronjs.org/"><img src="https://img.shields.io/badge/Electron-171717?style=flat-square&amp;logo=electron&amp;logoColor=white" alt="Built with Electron" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-171717?style=flat-square&amp;logo=typescript&amp;logoColor=white" alt="Written in TypeScript" /></a>
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#keyboard-shortcuts">Shortcuts</a> ·
  <a href="#contributing">Contributing</a>
</p>

---

Waveflow turns the track you are listening to into a scrolling waveform. Choose a visual style, let your album art set the color, and give the music room to breathe. Search and playlists stay a click away.

Built on [Pear Desktop](https://github.com/pear-devs/pear-desktop), with the player and visualizer together in one repository.

## Features

- **Music you can touch.** Vinyl pairs a live waveform sleeve with a spinning record. Turn the exposed grooves to seek: one revolution moves 30 seconds, clockwise forward and counterclockwise backward.
- **Five favorites, twelve visual styles.** Flow, Scope, Orbit, Vinyl and Stardust are always on the main selector. Flow, Scope and Orbit react to bass transients with stronger waves and rippling contours. **Dot styles** adds Stardust, Constellation and Dot Halo alongside the original Dots. Classic timeline styles remain under **More styles**.
- **Color that flows.** Choose Album, Aurora, Sunset, Ocean or Rainbow. Multiple colors travel smoothly across the waveform while the music plays. Existing solid colors remain available. Pause or Motion Off freezes the color travel.
- **A view that stays clear.** Cover art, track information and controls fade together after three seconds of inactivity while playing. Pointer or keyboard input brings them back; pausing keeps them visible.
- **Browsing within reach.** Open **Search**, **Playlists** or **YouTube Music**, then return with **Back to Waveflow**. Playback and waveform collection continue while you browse.
- **Waveforms that remember.** Save the parts you have heard locally, so repeat listens can show more of a track.
- **Direct control.** Fullscreen viewing, keyboard shortcuts, waveform dragging and zoom, with an English interface set in Pretendard.

### Choose your flow

| Style | Look |
| :--- | :--- |
| **Flow** (default) | A translucent, continuous wave shaped by the live frequency spectrum |
| **Scope** | A softly glowing, phase-aligned audio trace on a circular grid |
| **Orbit** | A thin, fluid ring that gently ripples with the music |
| **Vinyl** | A live waveform jacket with a spinning, interactive record emerging from behind it |
| **Stardust** | Flowing, layered particles shaped by the frequency spectrum |
| **Constellation** | A field of connected stars that expands with bass transients |
| **Dot Halo** | Seven rotating rings of dots that ripple with the music |
| **Classic** | Vertical bars with a reflection below the baseline |
| **Ribbon** | A continuous, flowing shape |
| **Spectrum** | Layered bass, midrange and treble bands |
| **Live** | A view of the audio arriving right now |
| **Dots** | The waveform drawn as points |

### See it in action

Screenshots use the actual Waveflow renderer and controls with deterministic demo audio. No personal account or playlist is shown.

![Flow · Aurora — Waveflow](docs/screenshots/flow.jpg)

**Five main styles**

Flow is the large wave above. Scope, Orbit, Vinyl and Stardust stay one click away.

<table>
  <tr>
    <td width="50%"><strong>Scope</strong><br /><img src="docs/screenshots/scope.jpg" alt="Scope — Waveflow" width="100%" /></td>
    <td width="50%"><strong>Orbit</strong><br /><img src="docs/screenshots/orbit.jpg" alt="Orbit — Waveflow" width="100%" /></td>
  </tr>
  <tr>
    <td width="50%"><strong>Vinyl</strong><br /><img src="docs/screenshots/vinyl.jpg" alt="Vinyl — Waveflow" width="100%" /></td>
    <td width="50%"><strong>Stardust</strong><br /><img src="docs/screenshots/particles.jpg" alt="Stardust — Waveflow" width="100%" /></td>
  </tr>
</table>

**Five color moods**

Album follows your cover art; Aurora, Sunset, Ocean and Rainbow blend multiple colors across the wave. Select a palette directly, or press **C** to cycle colors.

<table>
  <tr>
    <td width="50%"><strong>Album</strong><br /><img src="docs/screenshots/color-album.jpg" alt="Album — Waveflow" width="100%" /></td>
    <td width="50%"><strong>Sunset</strong><br /><img src="docs/screenshots/color-sunset.jpg" alt="Sunset — Waveflow" width="100%" /></td>
  </tr>
  <tr>
    <td width="50%"><strong>Ocean</strong><br /><img src="docs/screenshots/color-ocean.jpg" alt="Ocean — Waveflow" width="100%" /></td>
    <td width="50%"><strong>Rainbow</strong><br /><img src="docs/screenshots/color-rainbow.jpg" alt="Rainbow — Waveflow" width="100%" /></td>
  </tr>
</table>

<details>
<summary><strong>More styles</strong></summary>

<table>
  <tr>
    <td width="50%"><strong>Constellation</strong><br /><img src="docs/screenshots/constellation.jpg" alt="Constellation — Waveflow" width="100%" /></td>
    <td width="50%"><strong>Dot Halo</strong><br /><img src="docs/screenshots/dot-ring.jpg" alt="Dot Halo — Waveflow" width="100%" /></td>
  </tr>
  <tr>
    <td width="50%"><strong>Classic</strong><br /><img src="docs/screenshots/classic.jpg" alt="Classic — Waveflow" width="100%" /></td>
    <td width="50%"><strong>Ribbon</strong><br /><img src="docs/screenshots/ribbon.jpg" alt="Ribbon — Waveflow" width="100%" /></td>
  </tr>
  <tr>
    <td width="50%"><strong>Spectrum</strong><br /><img src="docs/screenshots/spectrum.jpg" alt="Spectrum — Waveflow" width="100%" /></td>
    <td width="50%"><strong>Live</strong><br /><img src="docs/screenshots/live.jpg" alt="Live — Waveflow" width="100%" /></td>
  </tr>
  <tr>
    <td width="50%"><strong>Dots</strong><br /><img src="docs/screenshots/dots.jpg" alt="Dots — Waveflow" width="100%" /></td>
    <td></td>
  </tr>
</table>

</details>

**Immersive viewing and hands-on control**

The cover and controls fade together while playing. Vinyl scrubbing keeps time visible as you turn the record; timeline modes show the waveform saved from previous listens.

<table>
  <tr>
    <td width="50%"><strong>Immersive view</strong><br /><img src="docs/screenshots/immersive.jpg" alt="Immersive view — Waveflow" width="100%" /></td>
    <td width="50%"><strong>Turn to seek</strong><br /><img src="docs/screenshots/vinyl-scrubbing.jpg" alt="Turn to seek — Waveflow" width="100%" /></td>
  </tr>
</table>

<details>
<summary><strong>Compact window</strong></summary>

<img src="docs/screenshots/compact.jpg" alt="Waveflow compact window" width="390" />

</details>

## Quick start

**Apple Silicon Mac:** [Download the latest DMG from the repository root](https://github.com/choijw1004/waveflow/raw/refs/heads/main/Waveflow-3.12.0-arm64.dmg). The checksum is in [`Waveflow-3.12.0-arm64.dmg.sha256`](Waveflow-3.12.0-arm64.dmg.sha256).

**Requirements:** Node.js 22.18+ and pnpm 11+.

macOS with Apple Silicon is the currently tested platform. The inherited Intel, Windows and Linux build targets have not been verified for Waveflow.

```sh
git clone https://github.com/choijw1004/waveflow.git
cd waveflow
pnpm install --frozen-lockfile
pnpm dev
```

1. Open the app to start on the Waveflow visualizer.
2. Click **YouTube Music** to sign in or **Search** to find a track.
3. Play a track, then press **W** or click **Back to Waveflow**.

Waveflow is enabled by default. If you previously turned it off, enable it again from the **Plugins** menu.

Everything runs from this checkout. No separate Pear Desktop checkout or sync step is needed.

### Move between music and visuals

| Button | Action |
| :--- | :--- |
| **Search** | Open YouTube Music search and focus the search field |
| **Playlists** | Open your YouTube Music playlists |
| **YouTube Music** | Return to the current browsing page |
| **Back to Waveflow** | Return to the visualizer |

### Build a macOS app

```sh
pnpm dist:mac:arm64
```

The app and installer are written to `pack/`:

```text
pack/
├── mac-arm64/Waveflow.app
└── Waveflow-<version>-arm64.dmg
```

The current macOS package uses ad-hoc signing and has not been notarized by Apple. Homebrew distribution is not set up yet; the instructions above build from source.

## Keyboard shortcuts

| Key | Action |
| :--- | :--- |
| <kbd>W</kbd> | Switch between Waveflow and YouTube Music |
| <kbd>Space</kbd> | Play / pause |
| <kbd>1</kbd>–<kbd>3</kbd> | Flow / Scope / Orbit |
| <kbd>4</kbd>–<kbd>8</kbd> | Classic / Ribbon / Spectrum / Live / Dots |
| <kbd>9</kbd> / <kbd>V</kbd> | Frequency response + interactive Vinyl |
| <kbd>D</kbd> | Cycle Stardust / Constellation / Dot Halo / Dots |
| <kbd>C</kbd> | Cycle colors |
| <kbd>M</kbd> | Cycle motion intensity |
| <kbd>F</kbd> | Toggle fullscreen |
| <kbd>/</kbd> | Open search |
| <kbd>P</kbd> | Open playlists |
| <kbd>←</kbd> / <kbd>→</kbd> | Seek backward / forward five seconds |
| <kbd>+</kbd> / <kbd>−</kbd> | Zoom in / out |
| <kbd>Esc</kbd> | Exit fullscreen, then return to YouTube Music |
| Drag the waveform | Seek through the track |
| Turn the LP | Seek 30 seconds per revolution, with live time feedback |

Visualizer shortcuts apply while Waveflow is open. **W** also opens it while browsing, except when you are typing in a field.

<details>
<summary><strong>How waveform history works</strong></summary>

On a first listen, Waveflow collects waveform peaks as the audio plays. Those samples are stored locally in IndexedDB for each track. On repeat listens, saved sections can appear ahead of the current playback position.

Seeking past a section leaves a gap until you listen to it. Waveform history can be disabled or cleared from the Waveflow plugin menu.

</details>

## Development

| Command | Purpose |
| :--- | :--- |
| `pnpm dev` | Run the desktop app in development mode |
| `pnpm screenshots` | Capture all README previews with demo audio |
| `pnpm test` | Run waveform, branding and UI integration checks |
| `pnpm typecheck` | Check TypeScript types |
| `pnpm build` | Build the Electron main, preload and renderer bundles |
| `pnpm start` | Run the built app |
| `pnpm dist:mac:arm64` | Package the Apple Silicon app and DMG |

<details>
<summary><strong>Repository layout</strong></summary>

```text
src/
├── plugins/waveflow/       Visuals, audio capture, navigation and cache
├── i18n/resources/         Interface strings
├── brand.ts               App identity and window titles
└── ...                    Pear Desktop host
icon/                      App icon and README banner
tests/                     Waveform and branding checks
scripts/check-ui.mjs       UI integration checks
waveflow/reference/        Original visual reference
```

</details>

## Contributing

Bug reports, visual ideas, performance improvements and pull requests are welcome.

- [Open an issue](https://github.com/choijw1004/waveflow/issues) with steps to reproduce a bug or describe your idea.
- For code changes, run `pnpm test` and `pnpm typecheck` before opening a pull request.
- For visual or interaction changes, include a screenshot or short recording and check the behavior in the desktop app.

## Credits & license

Waveflow builds on [Pear Desktop](https://github.com/pear-devs/pear-desktop). The imported host is based on commit [`3337446`](https://github.com/pear-devs/pear-desktop/commit/3337446b448454125ad261099a25f6b10fbb8cb6), and its copyright notice is retained in the [MIT license](license).

The interface uses [Pretendard](https://github.com/orioncactus/pretendard), bundled under the [SIL Open Font License](src/plugins/waveflow/assets/Pretendard-LICENSE.txt).

---

<p align="center">
  <a href="https://github.com/choijw1004/waveflow">Source</a> ·
  <a href="https://github.com/choijw1004/waveflow/issues">Issues</a> ·
  <a href="README.ko.md">한국어로 읽기</a>
</p>
