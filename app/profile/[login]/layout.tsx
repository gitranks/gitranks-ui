import { cacheLife, cacheTag } from 'next/cache';

import { OwnerTab } from './components/owner-tab';
import { Header } from '@/components/header/header';
import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';

// Every profile renders on request as one piece, with no Suspense boundary or loading.tsx: React
// streams a large finished boundary into a hidden segment after the footer, so the profile would
// be missing from the page's main HTML. No generateStaticParams either: each profile URL it did
// not list would be rendered once and kept as a cached page, with no eviction. Cached data keeps
// the render cheap. Tab links show their own pending state instead of a loading.tsx skeleton.
export const instant = false;

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
