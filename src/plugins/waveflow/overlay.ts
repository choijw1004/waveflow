import { t } from './strings';
import { STYLES, type RGB, type WaveStyle } from './types';

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
  nextAccent: () => void;
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
  private readonly colorName: HTMLSpanElement;
  private readonly motionName: HTMLSpanElement;
  private readonly fsBtn: HTMLButtonElement;

  private playing = false;
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
    STYLES.forEach((style, i) => {
      const b = el('button', undefined, styles);
      b.type = 'button';
      b.setAttribute('role', 'radio');
      el('kbd', undefined, b).textContent = String(i + 1);
      el('span', undefined, b).textContent = t(
        `plugins.waveflow.styles.${style}`,
      );
      b.addEventListener('click', () => handlers.setStyle(style));
      this.styleButtons.push(b);
    });

    el('div', 'wf-spacer', dock);

    const colorBtn = el('button', 'wf-chip', dock);
    colorBtn.type = 'button';
    colorBtn.setAttribute(
      'aria-label',
      t('plugins.waveflow.overlay.color-label'),
    );
    el('span', 'wf-swatch', colorBtn);
    this.colorName = el('span', undefined, colorBtn);
    colorBtn.addEventListener('click', handlers.nextAccent);

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
      const buttons = [...root.querySelectorAll<HTMLButtonElement>('button')];
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
    if (this.playing && this.open) {
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
  }

  setStyle(style: WaveStyle) {
    this.styleButtons.forEach((b, i) =>
      b.setAttribute('aria-checked', String(STYLES[i] === style)),
    );
  }

  setAccent(name: string, color: RGB) {
    this.root.style.setProperty('--wf-accent', `rgb(${color.join(',')})`);
    this.colorName.textContent = name;
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
