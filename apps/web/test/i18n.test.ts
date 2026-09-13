import { describe, expect, it } from 'vitest';
import { dictionaries } from '../src/i18n';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe('dictionnaires de l’interface (EF-8.4)', () => {
  const reference = dictionaries.fr;

  for (const [locale, messages] of Object.entries(dictionaries)) {
    it(`${locale} : chaque texte existe, n’est pas vide et reprend les paramètres du français`, () => {
      expect(Object.keys(messages).sort()).toEqual(Object.keys(reference).sort());
      for (const [key, text] of Object.entries(messages)) {
        expect(text.trim(), key).not.toBe('');
        expect(placeholders(text), key).toEqual(placeholders(reference[key as keyof typeof reference]));
      }
    });
  }
});
