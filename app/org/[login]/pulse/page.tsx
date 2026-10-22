'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { LayoutLeftColumn } from '../components/layout-left-column';
import { buildOrgPulseMetadata } from '../seo';
import { OrgActivityCard } from './components/org-activity-card';
import { fetchOrg } from '@/graphql/helpers/fetch-org';

export async function generateMetadata({ params }: PageProps<'/org/[login]/pulse'>): Promise<Metadata> {
  const { login } = await params;
  const org = await fetchOrg(login);

  if (!org) {
    return {};
  }

  return buildOrgPulseMetadata(org);
}

// Only the shell renders here, from the same cached org data as the Overview tab. The chart loads
// in the browser, so a cached copy of this page stays small and holds no chart data.
export default async function OrgPulsePage({ params }: PageProps<'/org/[login]/pulse'>) {
  const { login } = await params;
  cacheLife('hours');
  cacheTag(`org:${login}`);

  const org = await fetchOrg(login);

  if (!org?.login) {
    notFound();
  }

  return (
    <LayoutLeftColumn org={org}>
      <OrgActivityCard login={org.login} />
    </LayoutLeftColumn>
  );
}
