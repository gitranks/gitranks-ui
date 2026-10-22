import { cacheLife, cacheTag } from 'next/cache';

import { Header } from '@/components/header/header';
import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';
import { fetchOrg } from '@/graphql/helpers/fetch-org';

// Renders on request as one piece, like the profile layout: no Suspense boundary (it would move
// the page into a hidden segment after the footer) and no generateStaticParams (each org URL it
// did not list would be kept as a cached page, with no eviction).
export const instant = false;

export default async function OrgLayout({ children, params }: LayoutProps<'/org/[login]'>) {
  'use cache';
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`org:${login}`);

  // Pulse covers only some orgs: the others keep a single page and no tabs, so no link leads to a
  // Pulse page with nothing on it. The org data is cached and shared with the pages.
  const org = await fetchOrg(login);

  return (
    <>
      <Header login={login} />
      {org?.hasActivity && (
        <TabsBar className="mb-4">
          <Tab href={`/org/${login}`} exact>
            Overview
          </Tab>
          <Tab href={`/org/${login}/pulse`}>Pulse</Tab>
        </TabsBar>
      )}
      {children}
    </>
  );
}
