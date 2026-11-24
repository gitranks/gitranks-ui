import { DEFAULT_LANGUAGE_COLOR } from '@/app/app.consts';

/** A language's colour, from the colours given (a profile's own languages), keyed by lower-case name; the site's grey for any other. */
export const languageColorOf = (language: string | null, colors: Readonly<Record<string, string>> = {}): string =>
  (language && colors[language.trim().toLowerCase()]) || DEFAULT_LANGUAGE_COLOR;

/** Languages and their colours, keyed by lower-case name: the first colour of each name wins. */
export function languageColorsOf(
  languages: ReadonlyArray<{ name?: string | null; color?: string | null } | null | undefined>,
): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const language of languages) {
    const name = language?.name?.trim().toLowerCase();
    if (name && language?.color && !colors[name]) colors[name] = language.color;
  }
  return colors;
}
