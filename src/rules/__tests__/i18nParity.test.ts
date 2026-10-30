import { describe, it, expect } from 'vitest';
import { LOCALES } from '../../locales';

describe('i18n Key Parity: English & Tamil', () => {
  it('LOCALES.en and LOCALES.ta have 100% identical keys with no missing translations', () => {
    const enKeys = Object.keys(LOCALES.en).sort();
    const taKeys = Object.keys(LOCALES.ta).sort();

    const missingInTa = enKeys.filter(k => !(k in LOCALES.ta));
    const missingInEn = taKeys.filter(k => !(k in LOCALES.en));

    expect(missingInTa, `Missing keys in Tamil locale: ${missingInTa.join(', ')}`).toEqual([]);
    expect(missingInEn, `Missing keys in English locale: ${missingInEn.join(', ')}`).toEqual([]);
    expect(enKeys.length).toBe(taKeys.length);
  });

  it('No translation string is empty in either locale', () => {
    Object.entries(LOCALES.en).forEach(([key, value]) => {
      expect(value && value.trim().length > 0, `English translation for key "${key}" is empty`).toBeTruthy();
    });

    Object.entries(LOCALES.ta).forEach(([key, value]) => {
      expect(value && value.trim().length > 0, `Tamil translation for key "${key}" is empty`).toBeTruthy();
    });
  });
});
