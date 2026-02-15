export default async function sitemap() {
  const pagesToParse = 100;
  const pages = Array.from({ length: pagesToParse }, (_, i) => i + 1);

  return pages.flatMap((page) => ({
    url: `${process.env.NEXT_PUBLIC_URI}/orgs/${page}`,
    changeFrequency: 'monthly',
    priority: 0.9 - (page / pagesToParse) * 0.5,
  }));
}
