import { Suspense } from 'react';

import { Header } from '@/components/header/header';
import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { TopGlobalRankingsDocument } from '@/types/generated/graphql';

import Loading from './loading';

type ProfileLayoutProps = Readonly<{ children: React.ReactNode; params: Promise<{ login: string }> }>;

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

async function ProfileLayoutAwaitParams({ children, params }: ProfileLayoutProps) {
  const { login } = await params;

  return (
    <>
      <Header login={login} />
      <TabsBar className="mb-4">
        <Tab href={`/profile/${login}`} active>
          Overview
        </Tab>
        <Tab href={`/profile/${login}/ranks`}>Ranks</Tab>
        <Tab href={`/profile/${login}/repositories`}>Repositories</Tab>
      </TabsBar>
      {children}
    </>
  );
}

export default async function ProfileLayout({ children, params }: ProfileLayoutProps) {
  return (
    <Suspense fallback={<LayoutLoading />}>
      <ProfileLayoutAwaitParams params={params}>{children}</ProfileLayoutAwaitParams>
    </Suspense>
  );
}
