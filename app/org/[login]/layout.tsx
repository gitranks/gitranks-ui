'use cache';

import { cacheLife, cacheTag } from 'next/cache';
import { Suspense } from 'react';

import Loading from '@/app/profile/[login]/loading';
import { Header } from '@/components/header/header';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { OrgRankingsDocument } from '@/types/generated/graphql';

export async function generateStaticParams() {
  const { orgRankings } = (await graphqlDirect(OrgRankingsDocument, { offset: 0 })) ?? {};
  return orgRankings?.map((ranking) => ({ login: ranking.organization?.login })) ?? [];
}

function LayoutLoading() {
  return (
    <>
      <Header />
      <Loading />
    </>
  );
}

export default async function OrgLayout({ children, params }: LayoutProps<'/org/[login]'>) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`org:${login}`);

  return (
    <Suspense fallback={<LayoutLoading />}>
      <Header login={login} />
      {children}
    </Suspense>
  );
}
