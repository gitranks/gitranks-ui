'use cache';

import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';

import { buildContributorsSEO } from '../../tab-seo';
import { repoForTab, repoForTabMetadata } from '../repo-tab-data';
import { RepoContributorsScreen } from './components/repo-contributors-screen';
import { fetchRepoPulseFacts } from '@/graphql/helpers/fetch-repo-pulse';

export async function generateMetadata({ params }: PageProps<'/repo/[owner]/[name]/contributors'>): Promise<Metadata> {
  const { owner, name } = await params;
  const repo = await repoForTabMetadata(owner, name);
  if (!repo) {
    return {};
  }
  const { pulse } = await fetchRepoPulseFacts(repo.owner, repo.name);
  return buildContributorsSEO(repo, pulse).metadata;
}

export default async function RepoContributorsPage({ params }: PageProps<'/repo/[owner]/[name]/contributors'>) {
  const { owner, name } = await params;
  const repo = await repoForTab(owner, name, 'contributors');

  const { pulse, complete } = await fetchRepoPulseFacts(repo.owner, repo.name);
  // A failed analytics read may work soon: such a page is kept only briefly.
  if (!complete) {
    cacheLife('minutes');
  }

  return <RepoContributorsScreen repo={repo} pulse={pulse} jsonLd={buildContributorsSEO(repo, pulse).jsonLd} />;
}
