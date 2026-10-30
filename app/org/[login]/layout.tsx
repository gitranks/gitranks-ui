import { cacheLife, cacheTag } from 'next/cache';

import { Header } from '@/components/header/header';

// Renders as one piece, like the profile layout: no Suspense boundary (it would move the page into
// a hidden segment after the footer). One organization is listed in generateStaticParams, so any
// other renders on request as a whole page before the response starts, and one that is not there
// answers 404. Each such page is then kept in memory only (`lib/cache/page-cache-handler.cjs`).
export const instant = false;

export async function generateStaticParams() {
  return [{ login: 'vercel' }];
}

export default async function OrgLayout({ children, params }: LayoutProps<'/org/[login]'>) {
  'use cache';
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`org:${login}`);

  return (
    <>
      <Header title={login} />
      {children}
    </>
  );
}
