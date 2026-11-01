import { cacheLife, cacheTag } from 'next/cache';

import { ProfileFrame } from './components/profile-frame';

// Every profile renders as one piece, with no Suspense boundary or loading.tsx: React streams a
// large finished boundary into a hidden segment after the footer, so the profile would be missing
// from the page's main HTML. Cached data keeps the render cheap. Tab links show their own pending
// state instead of a loading.tsx skeleton.
//
// One login is listed in generateStaticParams, so every other profile renders on request as a
// whole page before the response starts: there is no fallback shell, and a profile that is not
// there answers 404 rather than a 200 carrying the not-found page. Each such page is then kept in
// memory only (`lib/cache/page-cache-handler.cjs`), never on disk.
export const instant = false;

export async function generateStaticParams() {
  return [{ login: 'torvalds' }];
}

export default async function ProfileLayout({ children, params }: LayoutProps<'/profile/[login]'>) {
  'use cache';
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`profile:${login}`);

  return <ProfileFrame login={login}>{children}</ProfileFrame>;
}
