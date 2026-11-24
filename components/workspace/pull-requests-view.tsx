import type { Route } from 'next';
import { redirect } from 'next/navigation';

import { PullRequestsScreen } from './pull-requests-screen';
import { effectiveSettingOf } from '@/lib/workspace/access-limits';
import {
  loadContribute,
  loadContributeActivity,
  loadContributeSetup,
  loadNeedsYou,
  loadPullRequestsPage,
  loadScheduleCounts,
} from '@/lib/workspace/contribute.data';
import type { ContributeView } from '@/lib/workspace/contribute.types';
import { isContributePageOpen } from '@/lib/workspace/contribute-state';
import type { LimitCounts } from '@/lib/workspace/limit-words';
import {
  PULL_REQUESTS_PAGE_SIZE,
  type PullRequestsFilter,
  pullRequestsPath,
  WORKSPACE_PATHS,
} from '@/lib/workspace/paths';
import { contributeHidden } from '@/lib/workspace/setting-up';

type Search = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** The filters the address asks for: a state chip, a side, a page; anything else is left out. */
export function pullRequestsFilterOf(search: Search): PullRequestsFilter {
  const state = one(search.state);
  const made = one(search.made);
  const page = Number(one(search.page));
  return {
    ...(state === 'open' || state === 'merged' || state === 'closed' ? { state } : {}),
    ...(made === 'contribute' || made === 'learn' ? { made } : {}),
    ...(Number.isInteger(page) && page > 1 ? { page } : {}),
  };
}

/** The limit's line: what it counts and the limit that holds; undefined while either is not known. */
function limitOf(view: ContributeView, prBound: number | undefined, open: number | undefined): LimitCounts | undefined {
  const settings = view.contributor?.settings;
  const limits = view.contributor?.limits;
  const limit = settings
    ? effectiveSettingOf(settings, limits, 'openPrsAtATime')
    : typeof limits?.openPrsEffective === 'number'
      ? limits.openPrsEffective
      : undefined;
  return typeof prBound === 'number' && typeof limit === 'number' ? { count: prBound, limit, open } : undefined;
}

/** The Pull requests tab's reads: the user, what waits on them, a page of their pull requests, the limit's counts. */
export async function PullRequestsView({ searchParams }: { searchParams: Promise<Search> }) {
  const filter = pullRequestsFilterOf(await searchParams);
  const page = filter.page ?? 1;
  const [view, needsYou, pulls, counts, activity] = await Promise.all([
    loadContribute(),
    loadNeedsYou(),
    loadPullRequestsPage({
      page,
      state: filter.state ? (filter.state.toUpperCase() as 'OPEN' | 'MERGED' | 'CLOSED') : null,
      mode: filter.made === 'learn' ? 'LEARN' : filter.made === 'contribute' ? 'FIX' : null,
    }),
    loadScheduleCounts(),
    loadContributeActivity().catch(() => null),
  ]);
  if (!view) contributeHidden(await loadContributeSetup());
  if (!isContributePageOpen(view, 'me')) redirect(WORKSPACE_PATHS.contribute);
  // A page past the end: the last page.
  const total = pulls?.total ?? null;
  if (pulls && typeof total === 'number' && !pulls.items.length && page > 1) {
    const last = Math.max(1, Math.ceil(total / PULL_REQUESTS_PAGE_SIZE));
    if (last < page) redirect(pullRequestsPath({ ...filter, page: last }) as Route);
  }
  return (
    <PullRequestsScreen
      sides={view.sides}
      limit={limitOf(view, counts?.prBound, pulls?.totals.open)}
      needsYou={needsYou}
      page={pulls}
      filter={filter}
      activity={activity}
      now={new Date()}
    />
  );
}
