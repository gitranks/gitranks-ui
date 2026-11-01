import type { Route } from 'next';
import Link from 'next/link';
import type { FC } from 'react';

import { formatFull, GithubAvatar, LandingSection } from './landing-ui';
import { ALL_REPOS_LINK, REPO_LANGUAGES_LINK } from '@/app/repos/components/repo-ranking-header';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import { StarCount } from '@/components/star-count/star-count';
import { cn } from '@/lib/utils';
import type { RepoRankingsQuery } from '@/types/generated/graphql';
import { getRepoPath } from '@/utils/repo-paths';

type RepoRow = RepoRankingsQuery['repoRankings'][number];
type RankedRepo = RepoRow & { s: number; repo: NonNullable<RepoRow['repo']> };

export const TOP_REPOS_ROWS = 10;
export const RISING_REPOS_ROWS = 5;

const isRanked = (row: RepoRow): row is RankedRepo => !!row.repo && !!row.s;

/** The repositories of `rows` that gained the most stars this month, gainers only. */
export const risingRepos = (rows: RankedRepo[]) =>
  rows
    .filter((row) => (row.repo.gainedThisMonth ?? 0) > 0)
    .sort((a, b) => (b.repo.gainedThisMonth ?? 0) - (a.repo.gainedThisMonth ?? 0))
    .slice(0, RISING_REPOS_ROWS);

const Gained: FC<{ value?: number | null }> = ({ value }) =>
  value ? (
    <span className={value > 0 ? 'text-positive' : 'text-negative'}>
      {value > 0 ? '+' : ''}
      {formatFull(value)}
    </span>
  ) : null;

/** No tier badge: every repository here is from the ranking's first page, so all would wear the same one. */
const RepoName: FC<{ repo: RankedRepo['repo']; size: number }> = ({ repo, size }) => (
  <Link
    href={getRepoPath(repo.nameWithOwner)}
    prefetch={false}
    // Long names are cut on phones; the tooltip keeps them readable.
    title={repo.nameWithOwner}
    className="flex min-w-0 items-center gap-2 font-medium hover:underline"
  >
    <GithubAvatar url={repo.ownerAvatarUrl} size={size} className="shrink-0 rounded-md" />
    <span className="truncate" translate="no">
      {repo.nameWithOwner}
    </span>
  </Link>
);

/**
 * The top of the repository ranking and, beside it, the biggest gainers of that first page this
 * month. Renders nothing until repositories are ranked.
 */
export const ReposSection: FC<{ rows: RepoRow[] }> = ({ rows }) => {
  const ranked = rows.filter(isRanked);

  if (!ranked.length) {
    return null;
  }

  const rising = risingRepos(ranked);
  // The rank of the last row read, not the row count: a row without its repository still holds a place.
  const coveredRanks = ranked[ranked.length - 1].s;
  const maxGain = rising[0]?.repo.gainedThisMonth ?? 1;

  return (
    <LandingSection
      id="repositories"
      eyebrow="Repositories"
      title="The most-starred repositories"
      intro="The projects with the most stars on GitHub, and the ones gaining stars fastest this month."
      action={
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href={ALL_REPOS_LINK.href as Route} prefetch={false} className="text-link underline">
            {ALL_REPOS_LINK.label}
          </Link>
          <Link href={REPO_LANGUAGES_LINK.href as Route} prefetch={false} className="text-link underline">
            {REPO_LANGUAGES_LINK.label}
          </Link>
        </span>
      }
    >
      <div className={cn('grid items-start gap-6', rising.length > 0 && 'lg:grid-cols-2')}>
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="w-px px-4 py-2 text-left font-medium">
                  <span aria-hidden="true">#</span>
                  <span className="sr-only">Rank</span>
                </th>
                <th scope="col" className="px-2 py-2 text-left font-medium">
                  Repository
                </th>
                <th scope="col" className="w-px px-4 py-2 text-right font-medium">
                  Stars
                </th>
                <th
                  scope="col"
                  className="hidden w-px px-4 py-2 text-right font-medium whitespace-nowrap sm:table-cell"
                >
                  This month<span className="sr-only">: stars gained</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ranked.slice(0, TOP_REPOS_ROWS).map((row, index) => (
                <tr
                  key={row.githubId}
                  // Phones see the top 5.
                  className={cn('border-b last:border-0 hover:bg-accent/60', index >= 5 && 'hidden sm:table-row')}
                >
                  <td className="px-4 py-2.5 font-mono whitespace-nowrap tabular-nums">
                    {row.s} <RankDelta current={row.s} previous={row.sM} className="ml-1 font-mono" />
                  </td>
                  <td className="max-w-0 px-2 py-2.5">
                    <RepoName repo={row.repo} size={24} />
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                    <StarCount
                      stars={row.repo.stars}
                      githubStars={row.repo.starsCheck?.githubStars}
                      notCounted={row.repo.starsCheck?.notCounted}
                    />
                  </td>
                  <td className="hidden px-4 py-2.5 text-right font-mono tabular-nums sm:table-cell">
                    <Gained value={row.repo.gainedThisMonth} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rising.length > 0 && (
          <div className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-0.5">
              <h3 className="font-semibold">Rising this month</h3>
              <p className="text-xs text-muted-foreground">Most stars gained this month among the top {coveredRanks}</p>
            </div>
            <ol className="flex flex-col gap-3 text-sm">
              {rising.map((row) => (
                <li key={row.githubId} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">#{row.s}</span>
                    <RepoName repo={row.repo} size={20} />
                    <span className="ml-auto shrink-0 font-mono tabular-nums">
                      <Gained value={row.repo.gainedThisMonth} />
                    </span>
                  </div>
                  <div className="ml-11 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <span
                      className="block h-full rounded-full bg-positive"
                      style={{ width: `${((row.repo.gainedThisMonth ?? 0) / maxGain) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </LandingSection>
  );
};
