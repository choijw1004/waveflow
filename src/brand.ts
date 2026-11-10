export const APPLICATION_NAME = 'Waveflow';
export const APPLICATION_ID = 'com.choijw1004.waveflow';

/** Keep the current track in the window title while identifying this app. */
export const windowTitle = (pageTitle: string) => {
  const title = pageTitle
    .replace(/\s*(?:[|–—-]\s*)?YouTube Music\s*$/, '')
    .trim();
  return !title || title === APPLICATION_NAME
    ? APPLICATION_NAME
    : `${title} | ${APPLICATION_NAME}`;
};
