'use cache';

import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';

import { buildRepoSEO, isRepoRanked } from '../../seo';
import { repoForTab, repoForTabMetadata } from '../repo-tab-data';
import { RepoOverviewScreen } from './components/repo-overview-screen';
import { OVERVIEW_DEPENDENTS } from '@/components/dependents/dependents.consts';
import { fetchRepoLanguages } from '@/graphql/helpers/fetch-repo-languages';
import { fetchRepoPackages, fetchRepoUsedBy, UNAVAILABLE } from '@/graphql/helpers/fetch-repo-packages';
import { fetchRepoRankTiers } from '@/graphql/helpers/fetch-repo-rank-tiers';

// Drawn at `/repo/<owner>/<name>`: the proxy sends that address here, and asked for by its own address this page is a
// 404. Its metadata is the repository's own.

export async function generateMetadata({ params }: PageProps<'/repo/[owner]/[name]/overview'>): Promise<Metadata> {
  const { owner, name } = await params;
  const repo = await repoForTabMetadata(owner, name);
  return repo ? buildRepoSEO(repo).metadata : {};
}

export default async function RepoOverviewPage({ params }: PageProps<'/repo/[owner]/[name]/overview'>) {
  const { owner, name } = await params;
  const repo = await repoForTab(owner, name, 'overview');

  const rank = isRepoRanked(repo) ? repo.rank : null;
  const [[languages, rankTiers], packages] = await Promise.all([
    rank ? Promise.all([fetchRepoLanguages(), fetchRepoRankTiers()]) : ([[], { tiers: null, ok: true }] as const),
    fetchRepoPackages(repo.owner, repo.name),
  ]);
  const dependents =
    packages && packages !== UNAVAILABLE && packages.dependents > 0
      ? await fetchRepoUsedBy(repo.owner, repo.name, {
          offset: 0,
          limit: OVERVIEW_DEPENDENTS,
          package: null,
          hideArchived: false,
        })
      : null;
  // A failed read of the tier table, or package data that could not be read: try again in minutes.
  if (!rankTiers.ok || packages === UNAVAILABLE || dependents === UNAVAILABLE) {
    cacheLife('minutes');
  }

  return (
    <RepoOverviewScreen
      repo={repo}
      languages={languages}
      tiers={rankTiers.tiers}
      packages={packages}
      dependents={dependents}
    />
  );
}
