import de from '@/lib/i18n/locales/de.json';
import en from '@/lib/i18n/locales/en.json';
import ru from '@/lib/i18n/locales/ru.json';
import i18n, { applyUiLanguage } from '@/lib/i18n';

type Tree = { [key: string]: string | Tree };

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = `${prefix}${key}`;
    if (typeof value === 'string') entries.set(path, value);
    else flatten(value, `${path}.`).forEach((text, nested) => entries.set(nested, text));
  }
  return entries;
}

/** Keys without plural suffixes: languages need different plural forms. */
function baseKeys(entries: Map<string, string>): string[] {
  return [...new Set([...entries.keys()].map((key) => key.replace(PLURAL_SUFFIX, '')))].sort();
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1] ?? '').sort();
}

const english = flatten(en);

describe.each([
  ['ru', ru],
  ['de', de],
])('%s translations', (_language, resource) => {
  const translated = flatten(resource as Tree);

  it('has exactly the same keys as English', () => {
    expect(baseKeys(translated)).toEqual(baseKeys(english));
  });

  it('keeps every placeholder and leaves no string empty', () => {
    translated.forEach((text, key) => {
      expect(text.trim()).not.toBe('');
      const source = english.get(key) ?? english.get(key.replace(PLURAL_SUFFIX, '_other'));
      expect({ key, placeholders: placeholders(text) }).toEqual({
        key,
        placeholders: placeholders(source ?? ''),
      });
    });
  });
});

describe('applyUiLanguage', () => {
  it('switches the interface to Russian and German', () => {
    applyUiLanguage('ru');
    expect(i18n.t('tabs.profile')).toBe('Профиль');
    applyUiLanguage('de');
    expect(i18n.t('tabs.profile')).toBe('Profil');
  });

  it('falls back to English for an unknown language', () => {
    applyUiLanguage('ru');
    applyUiLanguage('fr');
    expect(i18n.language).toBe('en');
    expect(i18n.t('tabs.profile')).toBe('Profile');
  });
});
