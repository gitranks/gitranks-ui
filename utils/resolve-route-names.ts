import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { fetchTopLanguages } from '@/graphql/helpers/top-languages';
import { matchRouteName } from '@/utils/match-route-name';

/** The `global` pseudo-country used by the language routes. */
export const GLOBAL_SCOPE = 'global';

/**
 * The stored spelling of a country from the URL (`germany` → `Germany`), or `undefined` when
 * no country matches. Rankings are keyed by the stored spelling, so case variants render the
 * same data and canonicalize to it.
 */
export async function resolveCountryName(name: string): Promise<string | undefined> {
  const countries = await fetchCountries();

  return matchRouteName(
    countries.map((c) => c.name),
    name,
  );
}

/** `global` stays as is; a country resolves to its stored spelling (see `resolveCountryName`). */
export async function resolveCountryScope(name: string): Promise<string | undefined> {
  return name.toLowerCase() === GLOBAL_SCOPE ? GLOBAL_SCOPE : resolveCountryName(name);
}

/**
 * The stored spelling of a language from the URL (`rust` → `Rust`), looked up among the most
 * popular languages. Others keep the URL spelling.
 */
export async function resolveLanguageName(name: string): Promise<string> {
  const languages = await fetchTopLanguages({ limit: 100 });

  return (
    matchRouteName(
      languages.map((l) => l.language),
      name,
    ) ?? name
  );
}
