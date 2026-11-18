'use cache';

import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { buildUsedBySEO } from '../../tab-seo';
import { repoForTab, repoForTabMetadata } from '../repo-tab-data';
import { UsedByScreen } from './components/used-by-screen';
import { DEPENDENTS_PAGE_SIZE } from '@/components/dependents/dependents.consts';
import {
  fetchRepoPackages,
  fetchRepoUsedBy,
  UNAVAILABLE,
  type Unavailable,
} from '@/graphql/helpers/fetch-repo-packages';
import type { RepoPackages } from '@/graphql/repo-packages';

/**
 * The first page of the tab's dependents, unfiltered: the one the page draws; `null` without a dependent. A publisher
 * with dependents whose list answers nothing is read as package data that could not be read: kept for minutes, not
 * indexed.
 */
async function firstPageOf(owner: string, name: string, packages: RepoPackages | Unavailable | null) {
  if (!packages || packages === UNAVAILABLE || packages.dependents === 0) return null;
  const page = await fetchRepoUsedBy(owner, name, {
    offset: 0,
    limit: DEPENDENTS_PAGE_SIZE,
    package: null,
    hideArchived: false,
  });
  return page ?? UNAVAILABLE;
}

export async function generateMetadata({ params }: PageProps<'/repo/[owner]/[name]/used-by'>): Promise<Metadata> {
  const { owner, name } = await params;
  const repo = await repoForTabMetadata(owner, name);
  if (!repo) {
    return {};
  }
  const packages = await fetchRepoPackages(repo.owner, repo.name);
  if (!packages) {
    return {};
  }
  const firstPage = await firstPageOf(repo.owner, repo.name, packages);
  const rows = firstPage && firstPage !== UNAVAILABLE ? firstPage.items : [];
  return buildUsedBySEO(repo, firstPage === UNAVAILABLE ? UNAVAILABLE : packages, rows).metadata;
}

export default async function RepoUsedByPage({ params }: PageProps<'/repo/[owner]/[name]/used-by'>) {
  const { owner, name } = await params;
  const repo = await repoForTab(owner, name, 'used-by');

  const packages = await fetchRepoPackages(repo.owner, repo.name);
  // A repository that publishes no package has no Used by tab.
  if (!packages) {
    notFound();
  }
  const firstPage = await firstPageOf(repo.owner, repo.name, packages);
  if (packages === UNAVAILABLE || firstPage === UNAVAILABLE) {
    cacheLife('minutes');
  }

  const rows = firstPage && firstPage !== UNAVAILABLE ? firstPage.items : [];
  const shown = firstPage === UNAVAILABLE ? UNAVAILABLE : packages;

  return (
    <UsedByScreen
      nameWithOwner={repo.nameWithOwner}
      packages={shown}
      firstPage={firstPage}
      jsonLd={buildUsedBySEO(repo, shown, rows).jsonLd}
    />
  );
}
