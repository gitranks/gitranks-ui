import { cacheLife, cacheTag } from 'next/cache';

import { OwnerTab } from './components/owner-tab';
import { Header } from '@/components/header/header';
import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';

// Every profile renders as one piece, with no Suspense boundary or loading.tsx: React streams a
// large finished boundary into a hidden segment after the footer, so the profile would be missing
// from the page's main HTML. Cached data keeps the render cheap. Tab links show their own pending
// state instead of a loading.tsx skeleton.
//
// One login is listed in generateStaticParams, so every other profile renders on request as a
// whole page before the response starts: there is no fallback shell, and a profile that is not
// there answers 404 rather than a 200 carrying the not-found page. Each such page is then kept in
// the page cache, which the page-cache cleaner caps.
export const instant = false;

export async function generateStaticParams() {
  return [{ login: 'torvalds' }];
}

export default async function ProfileLayout({ children, params }: LayoutProps<'/profile/[login]'>) {
  'use cache';
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`profile:${login}`);

  return (
    <>
      <Header login={login} />
      <TabsBar className="mb-4">
        <Tab href={`/profile/${login}`} pathnames={[`/profile/${login}`, `/profile/${login}/country`]}>
          Overview
        </Tab>
        <Tab href={`/profile/${login}/ranks`}>Ranks</Tab>
        <Tab href={`/profile/${login}/repositories`}>Repositories</Tab>
        <Tab href={`/profile/${login}/languages`}>Languages</Tab>
        <OwnerTab login={login} href={`/profile/${login}/privacy`}>
          Privacy
        </OwnerTab>
      </TabsBar>
      {children}
    </>
  );
}
