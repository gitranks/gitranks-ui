import { fetchCountries } from '@/graphql/helpers/fetch-countries';

export default async function sitemap() {
  const pagesToParse = 10;
  const pages = Array.from({ length: pagesToParse }, (_, i) => i + 1);
  const rankingTypes = ['contributions', 'followers', 'stars'] as const;
  const countries = await fetchCountries();
  const countryNames = countries.slice(0, 100).map((country) => country.name);

  return pages.flatMap((page) => {
    const priority = 0.9 - (page / pagesToParse) * 0.5;
    return countryNames.flatMap((name) => {
      return rankingTypes.map((rankingType) => ({
        url: `${process.env.NEXT_PUBLIC_URI}/country/${name}/${rankingType}/${page}`,
        changeFrequency: 'monthly',
        priority,
      }));
    });
  });
}
