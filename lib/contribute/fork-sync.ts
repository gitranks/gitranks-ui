/**
 * A fork sync GitHub refused because upstream's newer commits change `.github/workflows`, which the app GitRanks pushes
 * with may not touch (no `workflow` permission, by design). GitRanks cannot sync it; the user can, from the fork's
 * page on GitHub (Sync fork, then Update branch).
 */
export const SYNC_WORKFLOWS = 'sync_workflows';

const FORK_NAME = /^[\w.-]+\/[\w.-]+$/;

/** The fork's page on GitHub, where its Sync fork button is, when the sync was refused for workflows; else null. */
export function forkSyncUrlOf(reason: string | null | undefined, fork: string | null | undefined): string | null {
  if (reason !== SYNC_WORKFLOWS || !fork || !FORK_NAME.test(fork)) return null;
  return `https://github.com/${fork}`;
}
