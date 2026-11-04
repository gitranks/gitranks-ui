import type { ContributeMaintainerRepo, ContributeOptOutResult, ContributeRepoPermission } from './contribute.types';

/** GitHub's permission as a role, in plain words: never GitHub's own names. */
export function roleWordOf(permission: ContributeRepoPermission): string {
  if (permission === 'ADMIN' || permission === 'MAINTAIN') return 'Maintainer';
  if (permission === 'WRITE' || permission === 'TRIAGE') return 'Collaborator';
  return 'User';
}

export type OptOutChange = 'out' | 'in';

/** `Oct 28, 2026`, in UTC. */
export const fullDayLabel = (iso: string | null | undefined) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

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
