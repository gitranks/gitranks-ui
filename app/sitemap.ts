export default async function sitemap() {
  const priority = 1;
  return [
    {
      url: `${process.env.NEXT_PUBLIC_URI}`,
      changeFrequency: 'monthly',
      priority,
    },
    {
      url: `${process.env.NEXT_PUBLIC_URI}/countries/stars/1`,
      changeFrequency: 'monthly',
      priority,
    },
    {
      url: `${process.env.NEXT_PUBLIC_URI}/countries/contributions/1`,
      changeFrequency: 'monthly',
      priority,
    },
    {
      url: `${process.env.NEXT_PUBLIC_URI}/countries/followers/1`,
      changeFrequency: 'monthly',
      priority,
    },
    {
      url: `${process.env.NEXT_PUBLIC_URI}/countries/users/1`,
      changeFrequency: 'monthly',
      priority,
    },
    {
      url: `${process.env.NEXT_PUBLIC_URI}/badge/gallery`,
      changeFrequency: 'monthly',
      priority,
    },
    {
      url: `${process.env.NEXT_PUBLIC_URI}/badge/builder`,
      changeFrequency: 'monthly',
      priority,
    },
  ];
}
