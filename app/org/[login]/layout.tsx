'use cache';

import { cacheLife, cacheTag } from 'next/cache';
import { Suspense } from 'react';

import Loading from '@/app/profile/[login]/loading';
import { Header } from '@/components/header/header';

// import { graphqlDirect } from '@/lib/graphql/graphql-direct';
// import { OrgRankingsDocument } from '@/types/generated/graphql';

// export async function generateStaticParams() {
//   const { orgRankings } = (await graphqlDirect(OrgRankingsDocument, { offset: 0 })) ?? {};
//   return orgRankings?.map((ranking) => ({ login: ranking.organization?.login })) ?? [];
// }

function LayoutLoading() {
  return (
    <>
      <Header />
      <Loading />
    </>
  );
}

async function OrgLayoutContent({ children, params }: LayoutProps<'/org/[login]'>) {
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

export default function OrgLayout({ children, params }: LayoutProps<'/org/[login]'>) {
  return (
    <Suspense fallback={<LayoutLoading />}>
      <OrgLayoutContent params={params}>{children}</OrgLayoutContent>
    </Suspense>
  );
}
