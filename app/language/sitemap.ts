import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { fetchTopLanguages } from '@/graphql/helpers/top-languages';

export default async function sitemap() {
  const pagesToParse = 2;
  const pages = Array.from({ length: pagesToParse }, (_, i) => i + 1);
  const [countries, languages] = await Promise.all([fetchCountries(), fetchTopLanguages({ limit: 10 })]);

  const countryNames = countries.slice(0, 10).map((country) => country.name);
  const languageNames = languages.slice(0, 10).map((language) => language.language);

  return pages.flatMap((page) => {
    const priority = 0.9 - (page / pagesToParse) * 0.5;
    return countryNames.flatMap((country) => {
      return languageNames.map((language) => ({
        url: `${process.env.NEXT_PUBLIC_URI}/language/${language}/${country}/${page}`,
        changeFrequency: 'monthly',
        priority,
      }));
    });
  });
}
