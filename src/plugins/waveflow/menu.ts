import { t } from '@/i18n';

import {
  ACCENTS,
  CLEAR_CACHE_CHANNEL,
  MOTIONS,
  STYLES,
  TOGGLE_CHANNEL,
  type WaveflowPluginConfig,
} from './types';

import type { MenuContext } from '@/types/contexts';
import type { MenuItemConstructorOptions } from 'electron';

export const menu = async ({
  getConfig,
  setConfig,
  window,
}: MenuContext<WaveflowPluginConfig>): Promise<
  MenuItemConstructorOptions[]
> => {
  const config = await getConfig();

  return [
    {
      label: t('plugins.waveflow.menu.open'),
      click() {
        window.webContents.send(TOGGLE_CHANNEL);
      },
    },
    { type: 'separator' },
    {
      label: t('plugins.waveflow.menu.style'),
      submenu: STYLES.map((style) => ({
        label: t(`plugins.waveflow.styles.${style}`),
        type: 'radio',
        checked: config.style === style,
        click() {
          setConfig({ style });
        },
      })),
    },
    {
      label: t('plugins.waveflow.menu.color'),
      submenu: ACCENTS.map((accent) => ({
        label: t(`plugins.waveflow.colors.${accent}`),
        type: 'radio',
        checked: config.accent === accent,
        click() {
          setConfig({ accent });
        },
      })),
    },
    {
      label: t('plugins.waveflow.menu.motion'),
      submenu: MOTIONS.map((motion) => ({
        label: t(`plugins.waveflow.motions.${motion}`),
        type: 'radio',
        checked: config.motion === motion,
        click() {
          setConfig({ motion });
        },
      })),
    },
    { type: 'separator' },
    {
      label: t('plugins.waveflow.menu.cache'),
      type: 'checkbox',
      checked: config.cache,
      click(item) {
        setConfig({ cache: item.checked });
      },
    },
    {
      label: t('plugins.waveflow.menu.clear-cache'),
      click() {
        window.webContents.send(CLEAR_CACHE_CHANNEL);
      },
    },
  ];
};
