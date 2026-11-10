import { createPlugin } from '@/utils';

import fontLicense from './assets/Pretendard-LICENSE.txt?raw';
import { backend } from './backend';
import { menu } from './menu';
import { renderer } from './renderer';
import { t } from './strings';
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
  stylesheets: [`/* ${fontLicense} */\n${style}`],
  menu,
  backend,
  renderer,
});
