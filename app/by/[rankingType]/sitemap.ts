export default async function sitemap() {
  const pagesToParse = 100;
  const pages = Array.from({ length: pagesToParse }, (_, i) => i + 1);
  const rankingTypes = ['contributions', 'followers', 'stars'] as const;

  return pages.flatMap((page) => {
    const priority = 0.9 - (page / pagesToParse) * 0.5;
    return rankingTypes.map((rankingType) => ({
      url: `${process.env.NEXT_PUBLIC_URI}/by/${rankingType}/${page}`,
      changeFrequency: 'monthly',
      priority,
    }));
  });
}
