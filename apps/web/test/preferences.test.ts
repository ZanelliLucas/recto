import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, resolveReducedMotion, resolveTheme, sanitizePreferences } from '../src/settings/preferences';

const system = (prefersLight: boolean, prefersReducedMotion: boolean) => ({ prefersLight, prefersReducedMotion });

describe('réglages persistants (EF-8.1)', () => {
  it('retombe sur les valeurs par défaut face à un stockage absent ou altéré', () => {
    expect(sanitizePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(sanitizePreferences({ sound: 'oui', theme: 'violet', motion: 42, locale: 'xx' })).toEqual(DEFAULT_PREFERENCES);
    expect(sanitizePreferences({ sound: true, theme: 'clair', motion: 'reduites' })).toEqual({
      sound: true,
      theme: 'clair',
      motion: 'reduites',
      locale: 'fr',
    });
  });

  it('thème sombre par défaut ; « système » suit la préférence de l’appareil (§ 6.1)', () => {
    expect(DEFAULT_PREFERENCES.theme).toBe('sombre');
    expect(resolveTheme('sombre', system(true, false))).toBe('dark');
    expect(resolveTheme('clair', system(false, false))).toBe('light');
    expect(resolveTheme('systeme', system(true, false))).toBe('light');
    expect(resolveTheme('systeme', system(false, false))).toBe('dark');
  });

  it('la préférence système de réduction des animations prévaut toujours (ENF-4.3)', () => {
    expect(resolveReducedMotion('systeme', system(false, true))).toBe(true);
    expect(resolveReducedMotion('reduites', system(false, false))).toBe(true);
    expect(resolveReducedMotion('systeme', system(false, false))).toBe(false);
  });
});
