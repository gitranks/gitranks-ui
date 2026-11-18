import type { FC, ReactNode } from 'react';

import { isRepoRanked } from '../seo';
import { OVERVIEW_SEGMENT, repoTabPath } from '../utils/repo-tabs';
import { RepoLayout } from './repo-layout';
import { builderHref } from '@/app/badge/builder/[[...login]]/utils/builder-state';
import { MoreLink } from '@/app/profile/[login]/components/profile-card';
import type { RepoFacts } from '@/badge/v3/facts';
import { promotedBadges } from '@/badge/v3/promotion';
import { badgeTiles } from '@/badge/v3/tiles';
import { BadgeImages } from '@/components/badge-tiles/badge-tiles';
import { Header } from '@/components/header/header';
import { Link } from '@/components/link/link';
import { Tab } from '@/components/tabs/tabs';
import { TabsBar } from '@/components/tabs/tabs-bar';
import type { Unavailable } from '@/graphql/helpers/fetch-repo-packages';
import type { RepoPackages } from '@/graphql/repo-packages';
import type { PageRepoQuery } from '@/types/generated/graphql';
import { getRepoLanguageRankingPath } from '@/utils/repo-paths';

type RepoFrameProps = {
  repo: NonNullable<PageRepoQuery['repo']>;
  /** Its npm packages: `null` when it publishes none (no Used by tab), "unavailable" when they could not be read. */
  packages: RepoPackages | null | Unavailable;
  /** Active contributors of the last 12 months, from its analytics; `null` without analytics. */
  contributors: number | null;
  /** The repository's badge data, for the Badge row. */
  badgeFacts: RepoFacts | null;
  now?: Date;
  children: ReactNode;
};

/** One promoted badge and a link to all of them, at the end of the left column. Nothing without a badge to show. */
export const RepoBadgeRow: FC<{ facts: RepoFacts | null; now?: Date }> = ({ facts, now = new Date() }) => {
  if (!facts) {
    return null;
  }
  const [tile] = badgeTiles(facts, promotedBadges(facts, now), now);
  if (!tile) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <span className="text-sm font-medium">Badge</span>
      <Link
        href={tile.href}
        rel="nofollow"
        title="Get the code"
        className="flex rounded-lg border bg-background p-2.5 no-underline transition-colors hover:border-primary/60"
      >
        <BadgeImages tile={tile} className="h-auto w-auto max-w-full" />
      </Link>
      <MoreLink href={builderHref({ kind: 'repo', name: facts.nameWithOwner })} rel="nofollow" className="self-start">
        All badges
      </MoreLink>
    </div>
  );
};

/**
 * The tabbed repository page around the open tab: the header, the tabs (Overview, Used by when it publishes a package,
 * Contributors) and the left column with its Badge row, kept mounted from tab to tab.
 */
export const RepoFrame: FC<RepoFrameProps> = ({ repo, packages, contributors, badgeFacts, now, children }) => {
  const rank = isRepoRanked(repo) ? repo.rank : null;
  const overview = repoTabPath(repo.nameWithOwner, 'overview');
  const dependents =
    packages && packages !== 'unavailable' && packages.dependents > 0 ? packages.dependents : undefined;

  return (
    <>
      <Header />
      <nav aria-label="Repository">
        <TabsBar className="mb-4">
          {/* The page is drawn at the address the proxy sends Overview to, and shown at the repository's own. */}
          <Tab href={overview} pathnames={[overview, `${overview}/`, `${overview}/${OVERVIEW_SEGMENT}`]}>
            Overview
          </Tab>
          {packages !== null && (
            <Tab href={repoTabPath(repo.nameWithOwner, 'used-by')} count={dependents}>
              Used by
            </Tab>
          )}
          <Tab href={repoTabPath(repo.nameWithOwner, 'contributors')} count={contributors ?? undefined}>
            Contributors
          </Tab>
        </TabsBar>
      </nav>
      <RepoLayout
        repo={repo}
        languageUrl={rank?.language ? getRepoLanguageRankingPath(rank.language) : undefined}
        badgeRow={<RepoBadgeRow facts={badgeFacts} now={now} />}
      >
        {children}
      </RepoLayout>
    </>
  );
};
