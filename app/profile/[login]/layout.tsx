import { cacheLife, cacheTag } from 'next/cache';
import { Suspense } from 'react';

import Loading from './loading';
import { Header } from '@/components/header/header';
import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { TopGlobalRankingsDocument } from '@/types/generated/graphql';

export async function generateStaticParams() {
  const { byStars, byContribution, byFollowers } = (await graphqlDirect(TopGlobalRankingsDocument)) ?? {};
  const mergedRanks = [...byStars, ...byContribution, ...byFollowers];

  const uniqueLogins = new Set<string>();

  mergedRanks.forEach((rank) => {
    if (rank.user) {
      uniqueLogins.add(rank.user.login);
    }
  });

  return [...uniqueLogins].map((login) => ({ login }));
}

function LayoutLoading() {
  return (
    <>
      <Header />
      <Loading />
    </>
  );
}

async function ProfileLayoutContent({ children, params }: LayoutProps<'/profile/[login]'>) {
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
      </TabsBar>
      {children}
    </>
  );
}

// The boundary sits outside the cached content: for a login that is not known at build time,
// the cached part cannot run, so the boundary's fallback becomes this route's static shell.
export default function ProfileLayout({ children, params }: LayoutProps<'/profile/[login]'>) {
  return (
    <Suspense fallback={<LayoutLoading />}>
      <ProfileLayoutContent params={params}>{children}</ProfileLayoutContent>
    </Suspense>
  );
}
