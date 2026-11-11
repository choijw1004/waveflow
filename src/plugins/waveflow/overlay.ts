import { palettePreview } from './palette';
import { t } from './strings';
import {
  ACCENTS,
  PRIMARY_ACCENTS,
  DOT_STYLES,
  PRIMARY_STYLES,
  STYLE_SHORTCUTS,
  STYLES,
  isDotStyle,
  type AccentName,
  type RGB,
  type WaveStyle,
} from './types';

import type { BrowseDestination } from './navigation';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** The cover, navigation and controls disappear together while playing. */
const IDLE_MS = 3000;

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  parent?: HTMLElement,
) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  parent?.append(node);
  return node;
};

const icon = (d: string) => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  svg.append(path);
  return svg;
};

export const formatTime = (s: number) => {
  s = Math.max(0, Number.isFinite(s) ? s : 0);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
};

export type OverlayHandlers = {
  togglePlay: () => void;
  setStyle: (style: WaveStyle) => void;
  setAccent: (accent: AccentName) => void;
  nextMotion: () => void;
  toggleFullscreen: () => void;
  browse: (destination: BrowseDestination) => void;
};

/** The fullscreen layer: glow, canvas, track header (top-left) and the auto-hiding dock. */
export class Overlay {
  readonly root: HTMLDivElement;
  readonly canvas: HTMLCanvasElement;

  private readonly ui: HTMLDivElement;
  private readonly cover: HTMLImageElement;
  private readonly title: HTMLHeadingElement;
  private readonly artist: HTMLParagraphElement;
  private readonly sub: HTMLParagraphElement;
  private readonly status: HTMLDivElement;
  private readonly playBtn: HTMLButtonElement;
  private readonly playIcon: SVGSVGElement;
  private readonly pauseIcon: SVGSVGElement;
  private readonly cur: HTMLSpanElement;
  private readonly dur: HTMLSpanElement;
  private readonly styleButtons: HTMLButtonElement[] = [];
  private readonly otherStyles: HTMLSelectElement;
  private readonly dotStyles: HTMLSelectElement;
  private readonly colorSelect: HTMLSelectElement;
  private readonly motionName: HTMLSpanElement;
  private readonly fsBtn: HTMLButtonElement;

  private playing = false;
  private scrubbing = false;
  private idleTimer: ReturnType<typeof setTimeout> | undefined;
  private lastCur = '';
  private lastDur = '';

  constructor(handlers: OverlayHandlers) {
    const root = el('div', 'waveflow');
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', t('plugins.waveflow.name'));
    root.lang = 'en';
    root.tabIndex = -1;
    if (navigator.userAgent.includes('Mac')) root.classList.add('wf-mac');
    this.root = root;

    el('div', 'wf-glow', root);
    this.canvas = el('canvas', 'wf-wave', root);
    this.canvas.setAttribute('aria-label', t('plugins.waveflow.overlay.aria'));

    const ui = (this.ui = el('div', 'wf-ui', root));
    const top = el('div', 'wf-top', ui);
    const track = el('header', 'wf-track', top);
    this.cover = el('img', 'wf-cover', track);
    this.cover.alt = '';
    this.cover.hidden = true;
    const meta = el('div', 'wf-meta', track);
    this.title = el('h1', 'wf-title', meta);
    this.artist = el('p', 'wf-artist', meta);
    this.sub = el('p', 'wf-sub', meta);
    this.status = el('div', 'wf-status', meta);
    this.status.hidden = true;

    const navigation = el('nav', 'wf-navigation', top);
    navigation.setAttribute(
      'aria-label',
      t('plugins.waveflow.overlay.browse-label'),
    );
    for (const destination of ['search', 'playlists', 'music'] as const) {
      const button = el('button', 'wf-chip', navigation);
      button.type = 'button';
      button.textContent = t(`plugins.waveflow.overlay.${destination}`);
      button.addEventListener('click', () => handlers.browse(destination));
    }

    const bottom = el('div', 'wf-bottom', ui);
    const dock = el('div', 'wf-dock', bottom);

    this.playBtn = el('button', 'wf-play', dock);
    this.playBtn.type = 'button';
    this.playIcon = icon('M7 4.5v15l13-7.5z');
    this.pauseIcon = icon('M6 4h4.5v16H6zM13.5 4H18v16h-4.5z');
    this.playBtn.append(this.playIcon, this.pauseIcon);
    this.playBtn.addEventListener('click', handlers.togglePlay);

    const time = el('div', 'wf-time', dock);
    this.cur = el('span', 'wf-cur', time);
    time.append(' / ');
    this.dur = el('span', 'wf-dur', time);

    const styles = el('div', 'wf-styles', dock);
    styles.setAttribute('role', 'radiogroup');
    styles.setAttribute(
      'aria-label',
      t('plugins.waveflow.overlay.styles-label'),
    );
    const previews = {
      flow: 'M2 12C5 12 4 5 7 5s2 14 5 14 2-14 5-14 2 7 5 7',
      scope: 'M2 12h3c2 0 1-7 4-7s3 14 6 14 1-7 4-7h3',
      orbit: 'M20 12c0 5-3 8-8 8s-8-4-8-8 4-8 8-8 8 3 8 8Z',
      particles:
        'M4 6h.01M12 3h.01M20 8h.01M7 14h.01M16 13h.01M11 21h.01M21 20h.01M3 21h.01',
      vinyl:
        'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM6 12a6 6 0 0 1 6-6m0 12a6 6 0 0 0 6-6',
    };
    PRIMARY_STYLES.forEach((style, i) => {
      const b = el('button', undefined, styles);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      const shortcutIndex = STYLE_SHORTCUTS.indexOf(style);
      const shortcut = shortcutIndex < 0 ? 'D' : String(shortcutIndex + 1);
      b.setAttribute('aria-keyshortcuts', shortcut);
      b.title = t(`plugins.waveflow.visuals.${style}`);
      b.append(icon(previews[style]));
      el('span', undefined, b).textContent = t(
        `plugins.waveflow.styles.${style}`,
      );
      el('kbd', undefined, b).textContent = shortcut;
      b.addEventListener('click', () => handlers.setStyle(style));
      b.addEventListener('keydown', (event) => {
        const direction =
          event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        if (!direction) return;
        event.preventDefault();
        event.stopPropagation();
        const next =
          (i + direction + PRIMARY_STYLES.length) % PRIMARY_STYLES.length;
        handlers.setStyle(PRIMARY_STYLES[next]);
        this.styleButtons[next].focus();
      });
      this.styleButtons.push(b);
    });

    this.dotStyles = el('select', 'wf-chip wf-dot-styles', dock);
    this.dotStyles.setAttribute(
      'aria-label',
      t('plugins.waveflow.overlay.dot-styles'),
    );
    const dotPlaceholder = el('option', undefined, this.dotStyles);
    dotPlaceholder.value = '';
    dotPlaceholder.disabled = true;
    dotPlaceholder.textContent = t('plugins.waveflow.overlay.dot-styles');
    for (const style of DOT_STYLES) {
      const option = el('option', undefined, this.dotStyles);
      option.value = style;
      option.textContent = t(`plugins.waveflow.styles.${style}`);
    }
    this.dotStyles.addEventListener('change', () => {
      const style = DOT_STYLES.find((style) => style === this.dotStyles.value);
      if (style) handlers.setStyle(style);
    });

    this.otherStyles = el('select', 'wf-chip wf-other-styles', dock);
    this.otherStyles.setAttribute(
      'aria-label',
      t('plugins.waveflow.overlay.other-styles'),
    );
    el('option', undefined, this.otherStyles).textContent = t(
      'plugins.waveflow.overlay.other-styles',
    );
    this.otherStyles.options[0].value = '';
    this.otherStyles.options[0].disabled = true;
    for (const style of STYLES.filter(
      (style) =>
        !(PRIMARY_STYLES as readonly string[]).includes(style) &&
        !isDotStyle(style),
    )) {
      const option = el('option', undefined, this.otherStyles);
      option.value = style;
      option.textContent = `${t(`plugins.waveflow.styles.${style}`)} · ${STYLES.indexOf(style) + 1}`;
    }
    this.otherStyles.addEventListener('change', () => {
      const style = STYLES.find((style) => style === this.otherStyles.value);
      if (style) handlers.setStyle(style);
    });

    el('div', 'wf-spacer', dock);

    const colorControl = el('label', 'wf-chip wf-palette', dock);
    el('span', 'wf-swatch', colorControl);
    this.colorSelect = el('select', 'wf-color-select', colorControl);
    this.colorSelect.setAttribute(
      'aria-label',
      t('plugins.waveflow.overlay.color-label'),
    );
    for (const accent of PRIMARY_ACCENTS) {
      const option = el('option', undefined, this.colorSelect);
      option.value = accent;
      option.textContent = t(`plugins.waveflow.colors.${accent}`);
    }
    const solid = el('optgroup', undefined, this.colorSelect);
    solid.label = t('plugins.waveflow.overlay.solid-colors');
    for (const accent of ACCENTS.filter(
      (accent) => !(PRIMARY_ACCENTS as readonly string[]).includes(accent),
    )) {
      const option = el('option');
      option.value = accent;
      option.textContent = t(`plugins.waveflow.colors.${accent}`);
      solid.append(option);
    }
    this.colorSelect.addEventListener('change', () => {
      const accent = ACCENTS.find(
        (accent) => accent === this.colorSelect.value,
      );
      if (accent) handlers.setAccent(accent);
    });

    const motionBtn = el('button', 'wf-chip', dock);
    motionBtn.type = 'button';
    motionBtn.setAttribute(
      'aria-label',
      t('plugins.waveflow.overlay.motion-label'),
    );
    motionBtn.append(`${t('plugins.waveflow.overlay.motion')} `);
    this.motionName = el('span', undefined, motionBtn);
    motionBtn.addEventListener('click', handlers.nextMotion);

    this.fsBtn = el('button', 'wf-chip', dock);
    this.fsBtn.type = 'button';
    this.fsBtn.addEventListener('click', handlers.toggleFullscreen);

    el('p', 'wf-hint', bottom).textContent = t('plugins.waveflow.overlay.hint');

    for (const ev of [
      'pointermove',
      'pointerdown',
      'wheel',
      'focusin',
      'focusout',
    ] as const) {
      root.addEventListener(ev, () => this.poke(), { passive: true });
    }
    root.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const buttons = [
        ...root.querySelectorAll<HTMLButtonElement | HTMLSelectElement>(
          'button:not([tabindex="-1"]), select, canvas[tabindex="0"]',
        ),
      ];
      const first = buttons[0];
      const last = buttons.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === root)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === root)
      ) {
        event.preventDefault();
        first?.focus();
      }
    });

    this.setPlaying(false);
    this.syncFullscreen();
    document.body.append(root);
  }

  get open() {
    return !this.root.hidden;
  }

  show() {
    this.root.hidden = false;
    this.root.focus({ preventScroll: true });
    this.poke();
  }

  hide() {
    this.root.hidden = true;
    clearTimeout(this.idleTimer);
  }

  destroy() {
    this.hide();
    this.root.remove();
  }

  /** Wake all chrome together and keep keyboard-focused controls visible. */
  poke() {
    const cl = this.root.classList;
    cl.remove('wf-idle');
    clearTimeout(this.idleTimer);
    if (this.playing && this.open && !this.scrubbing) {
      this.idleTimer = setTimeout(() => {
        if (!this.ui.querySelector(':focus-visible')) cl.add('wf-idle');
      }, IDLE_MS);
    }
  }

  setTrack(info: { title: string; artist: string; cover?: string | null }) {
    if (this.title.textContent !== info.title)
      this.title.textContent = info.title;
    if (this.artist.textContent !== info.artist)
      this.artist.textContent = info.artist;
    const cover = info.cover ?? '';
    if (this.cover.getAttribute('src') !== cover) {
      this.cover.hidden = !cover;
      if (cover) this.cover.src = cover;
      else this.cover.removeAttribute('src');
    }
  }

  setSub(text: string) {
    if (this.sub.textContent !== text) this.sub.textContent = text;
  }

  setStatus(text: string) {
    if (this.status.textContent !== text) this.status.textContent = text;
    this.status.hidden = !text;
  }

  setPlaying(playing: boolean) {
    if (playing === this.playing && this.playBtn.hasAttribute('aria-label'))
      return;
    this.playing = playing;
    this.playIcon.style.display = playing ? 'none' : '';
    this.pauseIcon.style.display = playing ? '' : 'none';
    this.playBtn.setAttribute(
      'aria-label',
      t(
        playing
          ? 'plugins.waveflow.overlay.pause'
          : 'plugins.waveflow.overlay.play',
      ),
    );
    this.poke();
  }

  setTime(cur: number, dur: number) {
    const c = formatTime(cur);
    const d = formatTime(dur);
    if (c !== this.lastCur) this.cur.textContent = this.lastCur = c;
    if (d !== this.lastDur) this.dur.textContent = this.lastDur = d;
    if (this.root.dataset.style === 'vinyl') {
      this.canvas.setAttribute('aria-valuemax', String(Math.max(0, dur)));
      this.canvas.setAttribute(
        'aria-valuenow',
        String(Math.max(0, Math.min(dur, cur))),
      );
      this.canvas.setAttribute('aria-valuetext', `${c} / ${d}`);
    }
  }

  setScrubbing(active: boolean) {
    this.scrubbing = active;
    this.root.classList.toggle('wf-scrubbing', active);
    this.poke();
  }

  setStyle(style: WaveStyle) {
    this.root.dataset.style = style;
    this.styleButtons.forEach((b, i) => {
      const selected = PRIMARY_STYLES[i] === style;
      b.setAttribute('aria-checked', String(selected));
      b.tabIndex =
        selected ||
        (!(PRIMARY_STYLES as readonly string[]).includes(style) && i === 0)
          ? 0
          : -1;
    });
    const other =
      !(PRIMARY_STYLES as readonly string[]).includes(style) &&
      !isDotStyle(style);
    this.otherStyles.value = other ? style : '';
    this.otherStyles.classList.toggle('wf-selected', other);
    this.dotStyles.value = isDotStyle(style) ? style : '';
    this.dotStyles.classList.toggle('wf-selected', isDotStyle(style));
    if (style === 'vinyl') {
      this.canvas.title = t('plugins.waveflow.overlay.record-hint');
      this.canvas.tabIndex = 0;
      this.canvas.setAttribute('role', 'slider');
      this.canvas.setAttribute(
        'aria-label',
        t('plugins.waveflow.overlay.record-control'),
      );
      this.canvas.setAttribute('aria-valuemin', '0');
      this.canvas.setAttribute('aria-valuemax', '0');
      this.canvas.setAttribute('aria-valuenow', '0');
    } else {
      this.canvas.removeAttribute('title');
      this.canvas.removeAttribute('tabindex');
      for (const attr of [
        'role',
        'aria-valuemin',
        'aria-valuemax',
        'aria-valuenow',
        'aria-valuetext',
      ])
        this.canvas.removeAttribute(attr);
      this.canvas.setAttribute(
        'aria-label',
        t('plugins.waveflow.overlay.aria'),
      );
    }
  }

  setAccent(name: string, color: RGB, accent: AccentName = 'album') {
    this.root.style.setProperty('--wf-accent', `rgb(${color.join(',')})`);
    this.colorSelect.value = accent;
    this.colorSelect.title = name;
    this.root.dataset.palette = accent;
    this.root.style.setProperty('--wf-swatch', palettePreview(accent, color));
  }

  setGlow(color: RGB | null) {
    if (color) {
      this.root.style.setProperty('--wf-glow', `rgba(${color.join(',')},0.2)`);
    } else {
      this.root.style.removeProperty('--wf-glow');
    }
  }

  setMotion(name: string) {
    this.motionName.textContent = name;
  }

  syncFullscreen() {
    const fs = document.fullscreenElement === this.root;
    this.fsBtn.textContent = t(
      fs
        ? 'plugins.waveflow.overlay.exit-fullscreen'
        : 'plugins.waveflow.overlay.fullscreen',
    );
  }
}
