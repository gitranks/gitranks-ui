'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { OrgScreen } from './components/org-screen';
import { buildOrgSEO } from './seo';
import { readBadgeFacts } from '@/badge/v3/card-facts';
import { loadBadgeOrgCard } from '@/badge/v3/load';
import { fetchOrg } from '@/graphql/helpers/fetch-org';

export async function generateMetadata({ params }: PageProps<'/org/[login]'>): Promise<Metadata> {
  const { login } = await params;
  const org = await fetchOrg(login);

  if (!org) {
    return {};
  }

  return buildOrgSEO(org).metadata;
}

export default async function OrgPage({ params }: PageProps<'/org/[login]'>) {
  const { login } = await params;
  cacheTag(`org:${login}`);

  // The card's read starts with the page's own, not after it.
  const [org, badges] = await Promise.all([fetchOrg(login), readBadgeFacts(loadBadgeOrgCard(login))]);

  // A page that rendered without its Badges card is kept briefly, so the card comes back soon.
  if (!badges.brief) {
    cacheLife('hours');
  } else {
    cacheLife('minutes');
  }

  if (!org) {
    notFound();
  }

  return <OrgScreen login={login} org={org} badgeFacts={badges.facts} />;
}
