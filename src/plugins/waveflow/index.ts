import { t } from '@/i18n';
import { createPlugin } from '@/utils';

import { backend } from './backend';
import { menu } from './menu';
import { renderer } from './renderer';
import style from './style.css?inline';
import { defaultConfig, type WaveflowPluginConfig } from './types';

export default createPlugin<
  typeof backend,
  unknown,
  typeof renderer,
  WaveflowPluginConfig
>({
  name: () => t('plugins.waveflow.name'),
  description: () => t('plugins.waveflow.description'),
  authors: ['choijw1004'],
  restartNeeded: false,
  config: defaultConfig,
  stylesheets: [style],
  menu,
  backend,
  renderer,
});
