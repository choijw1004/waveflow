import { existsSync } from 'node:fs';
import path from 'node:path';

import { app } from 'electron';

import { APPLICATION_NAME } from '../brand';

// The config store imports this in main and preload; only main owns app paths.
if (process.type === 'browser') {
  app.setName(APPLICATION_NAME);
  const currentProfile = app.getPath('userData');
  const legacyProfile = path.join(app.getPath('appData'), 'YouTube Music');
  if (
    !existsSync(path.join(currentProfile, 'config.json')) &&
    existsSync(path.join(legacyProfile, 'config.json'))
  ) {
    app.setPath('userData', legacyProfile);
  }
}
