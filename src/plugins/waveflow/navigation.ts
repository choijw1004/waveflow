import { t } from './strings';

import type { MusicPlayerAppElement } from '@/types/music-player-app-element';

export type BrowseDestination = 'music' | 'search' | 'playlists';

/** Uses YouTube Music's existing SPA so browsing never reloads the player. */
export class MusicNavigation {
  readonly launcher: HTMLButtonElement;
  private focusFrame = 0;

  constructor(open: () => void) {
    this.launcher = document.createElement('button');
    this.launcher.className = 'wf-launcher';
    this.launcher.type = 'button';
    this.launcher.lang = 'en';
    this.launcher.textContent = t('plugins.waveflow.overlay.back');
    this.launcher.title = t('plugins.waveflow.overlay.back-label');
    this.launcher.setAttribute('aria-keyshortcuts', 'w');
    this.launcher.addEventListener('click', open);
    document.body.append(this.launcher);
  }

  setVisible(visible: boolean) {
    cancelAnimationFrame(this.focusFrame);
    this.launcher.hidden = !visible;
  }

  browse(destination: BrowseDestination) {
    // The expanded player can otherwise cover the library and search results.
    const playerPage = document.querySelector<
      HTMLElement & { playerPageOpen_: boolean }
    >('ytmusic-player-page');
    if (
      playerPage?.playerPageOpen_ ||
      playerPage?.hasAttribute('player-page-open')
    ) {
      document.querySelector<HTMLElement>('.player-minimize-button')?.click();
    }

    if (destination === 'playlists') {
      document
        .querySelector<MusicPlayerAppElement>('ytmusic-app')
        ?.navigate('FEmusic_liked_playlists');
    } else if (destination === 'search') {
      const search = document.querySelector<HTMLElement & { opened: boolean }>(
        'ytmusic-search-box',
      );
      if (!search) return;
      search.opened = true;
      this.focusFrame = requestAnimationFrame(() => {
        const input =
          search.querySelector<HTMLInputElement>('input') ??
          search.shadowRoot?.querySelector<HTMLInputElement>('input');
        input?.focus();
        input?.select();
      });
    }
  }

  focus() {
    this.launcher.focus({ preventScroll: true });
  }

  destroy() {
    cancelAnimationFrame(this.focusFrame);
    this.launcher.remove();
  }
}
