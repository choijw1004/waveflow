import { t as translate } from '@/i18n';

/** Waveflow's interface stays in English regardless of Pear's language. */
export const t = (key: string, values: Record<string, unknown> = {}) =>
  translate(key, { ...values, lng: 'en' });
