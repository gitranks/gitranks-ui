import type { OwnerIssue } from '@/app/profile/[login]/components/profile-contribute-block';

/**
 * Contribute on the signed-in owner's own profile (owner-approved design 2026-11-12): before they connect, ready issues
 * picked for their repos and languages; once they are a contributor, the top of their own list. Nobody else's profile
 * shows it.
 */

/** The pool's numbers the block names; null when the API could not read them. */
export type ProfilePicksStats = { screenedRepos: number; issuesRead: number; readyIssues: number };

/** One issue of the block, as the API answers it. */
export type ProfilePick = {
  repo: string;
  number: number;
  url: string;
  title: string | null;
  labels: string[];
  /** The pool's language family (`js-ts`); the row shows `repoLanguage`. */
  language: string | null;
  kind: string | null;
  size: string | null;
  why: string[];
  testCommand: boolean;
  /** contributed: a repository they contributed to; language: one of their languages; listed: their own list. */
  fit: 'contributed' | 'language' | 'listed' | string;
  repoLanguage: { name: string; color: string } | null;
};

/** `GET /api/me/contribute/profile-block?login=`: what the owner's own profile shows them. */
export type OwnProfileBlockAnswer =
  | { kind: 'contributor'; issues: ProfilePick[] }
  | { kind: 'own'; issues: ProfilePick[]; stats: ProfilePicksStats | null }
  | { kind: 'none' };

export const OWN_PROFILE_BLOCK_PATH = '/api/me/contribute/profile-block';

/** A pick as the owner's block shows it: for the owner's own picks, why it is theirs first. */
export function ownIssueOf(pick: ProfilePick): OwnerIssue {
  return {
    repo: pick.repo,
    number: pick.number,
    url: pick.url,
    title: pick.title,
    language: pick.repoLanguage,
    why: pick.fit === 'contributed' ? 'You contributed to this repository' : (pick.why[0] ?? null),
  };
}

/** "TypeScript and Go": the repos' languages the owner's picks came from, in order, each once. */
export function ownMatchOf(picks: readonly ProfilePick[]): string | undefined {
  const names = [...new Set(picks.flatMap((pick) => (pick.repoLanguage ? [pick.repoLanguage.name] : [])))];
  if (!names.length) return undefined;
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
}
