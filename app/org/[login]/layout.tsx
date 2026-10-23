import { cacheLife, cacheTag } from 'next/cache';

import { Header } from '@/components/header/header';

// Renders on request as one piece, like the profile layout: no Suspense boundary (it would move
// the page into a hidden segment after the footer) and no generateStaticParams (each org URL it
// did not list would be kept as a cached page, with no eviction).
export const instant = false;

export default async function OrgLayout({ children, params }: LayoutProps<'/org/[login]'>) {
  'use cache';
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`org:${login}`);

  return (
    <>
      <Header login={login} />
      {children}
    </>
  );
}
