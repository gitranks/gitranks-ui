import type { ContributeMaintainerRepo, ContributeOptOutResult, ContributeRepoPermission } from './contribute.types';

export const PERMISSIONS: Record<ContributeRepoPermission, string> = {
  ADMIN: 'Admin',
  MAINTAIN: 'Maintain',
  WRITE: 'Write',
  TRIAGE: 'Triage',
  READ: 'Read',
};

export type OptOutChange = 'out' | 'in';

/** `Oct 28, 2026`, in UTC. */
export const fullDayLabel = (iso: string | null | undefined) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

/** `12.3K` stars. */
export const starsLabel = (stars: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.max(0, stars || 0));

/** What happened to one repository asked to be opted out (`out`) or back in (`in`), in plain words. */
export function optOutResultText(result: ContributeOptOutResult, change: OptOutChange): string {
  if (result.reason === 'NOT_MAINTAINER') {
    return 'Not changed: GitHub says your account does not administer or maintain it.';
  }
  if (result.reason === 'UNKNOWN_REPO') return 'Not changed: GitHub does not show this repo to your account.';
  if (change === 'out') return 'Opted out. No issue of it is picked and no pull request is opened there.';
  return result.optedOut ? 'Still opted out.' : 'Opted back in. Its issues may be picked again later.';
}

/** The listed repositories with what the API answered for each one asked. */
export function withOptOutResults(
  repos: ContributeMaintainerRepo[],
  results: ContributeOptOutResult[],
): ContributeMaintainerRepo[] {
  const byId = new Map(results.map((result) => [result.repoId, result]));
  return repos.map((repo) => {
    const result = byId.get(repo.repoId);
    if (!result || result.reason === 'UNKNOWN_REPO') return repo;
    return { ...repo, optedOut: result.optedOut, optedOutAt: result.optedOutAt };
  });
}
