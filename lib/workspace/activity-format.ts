import type {
  ContributeActivity,
  ContributeActivityItem,
  ContributeActivityRepoStage,
  ContributeActivityTab,
} from './contribute.types';

/**
 * The activity tabs a path shows: the Contribute tab, which holds the issues too, and Settings; none for a page with no
 * activity (the pull requests, an attempt, the Agent tab, Learn).
 */
export function activityTabsOf(pathname: string): ContributeActivityTab[] {
  const path = pathname.replace(/\/+$/, '');
  if (path === '/contribute') return ['OVERVIEW', 'ISSUES'];
  if (path === '/my/settings' || path.startsWith('/my/settings/')) return ['SETTINGS'];
  return [];
}

/** The items any of `tabs` shows, each once, in the activity's order. */
export const itemsOn = (
  activity: ContributeActivity | null,
  tabs: ContributeActivityTab | readonly ContributeActivityTab[] | null,
) => {
  const on: readonly ContributeActivityTab[] = tabs === null ? [] : typeof tabs === 'string' ? [tabs] : tabs;
  return (activity?.items ?? []).filter(({ tabs: its }) => its.some((tab) => on.includes(tab)));
};

/** Items that only wait (nothing moves until a slot frees or the user resumes): read again rarely. */
const WAITING_KINDS: ContributeActivityItem['kind'][] = ['FIRST_READS_WAITING', 'READS_PAUSED'];

/** Whether an item is work under way (its line moves), not a wait. */
export const isRunning = (item: ContributeActivityItem) => !WAITING_KINDS.includes(item.kind);

/**
 * What the page shows changes with this: an item ending or starting, a repo moving on. The page is read again when it
 * moves, so the lists and issues follow.
 */
export const activitySignatureOf = (activity: ContributeActivity | null) =>
  (activity?.items ?? [])
    .map(({ kind, done, repos }) => `${kind}:${done ?? ''}:${repos.map(({ stage }) => stage[0]).join('')}`)
    .join('|');

/** The bar's one line: the first item's, and how many more there are. */
export function summaryOf(items: ContributeActivityItem[]): string {
  if (!items.length) return '';
  const more = items.length - 1;
  return more ? `${items[0].label} · ${more} more` : items[0].label;
}

/** A repo's stage in a few words. */
export const STAGE_TEXT: Record<ContributeActivityRepoStage, string> = {
  CHECKING: 'Checking its rules',
  QUEUED: 'Up next',
  READING: 'Reading issues',
  SORTING: 'Sorting issues',
  READ: 'Done',
  WAITING: 'Waiting its turn',
  PAUSED: 'Paused',
};

/** "about 5 min", "about 1 h", or "any moment" once the estimate has passed. */
export function etaOf(expectedAt: string | null, now: Date): string | null {
  if (!expectedAt) return null;
  const minutes = Math.round((new Date(expectedAt).getTime() - now.getTime()) / 60_000);
  if (minutes <= 1) return 'any moment now';
  if (minutes < 60) return `about ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `about ${hours} h`;
}

/** Done of total as a share, for the thin progress line; null when it cannot be counted. */
export const shareOf = ({ done, total }: Pick<ContributeActivityItem, 'done' | 'total'>) =>
  done !== null && total ? Math.min(1, Math.max(0, done / total)) : null;

/** What a waiting item says it waits for. */
export const WAIT_TEXT: Partial<Record<ContributeActivityItem['kind'], string>> = {
  FIRST_READS_WAITING: "New repos are read in turn, and these are in the queue. We can't promise a time for them.",
  READS_PAUSED: 'Contributing is paused, so new repos are not read yet.',
};

/** The window event a page sends when the user starts something long: the bar reads at once and says so. */
export const ACTIVITY_STARTED_EVENT = 'contribute:activity-started';
