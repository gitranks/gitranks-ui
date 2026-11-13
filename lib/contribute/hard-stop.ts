import type { ContributeAttemptDetail, ContributePrNotes } from './contribute.types';
import { repoSaidNoOf } from './follow-up-format';

/** Every control on a contribution's page that writes to its pull request or starts work on it. */
export type ActionId =
  | 'start_run'
  | 'push'
  | 'discard_run'
  | 'post_reply'
  | 'sign_off'
  | 'retitle'
  | 'edit_description'
  | 'fix_changelog'
  | 'fix_link'
  | 'post_proof'
  | 'retry_proof'
  | 'proof_reply'
  | 'proof_fix'
  | 'retry'
  | 'resolve_threads';

export type HardStopKind = 'maintainer_stopped' | 'repo_said_no';

/** Why nothing of ours goes on, and which controls it holds back. */
export type HardStop = { kind: HardStopKind; blocked: ReadonlySet<ActionId> };

export const ACTION_IDS: readonly ActionId[] = [
  'start_run',
  'push',
  'discard_run',
  'post_reply',
  'sign_off',
  'retitle',
  'edit_description',
  'fix_changelog',
  'fix_link',
  'post_proof',
  'retry_proof',
  'proof_reply',
  'proof_fix',
  'retry',
  'resolve_threads',
];

const MAINTAINER_STOPPED: HardStop = { kind: 'maintainer_stopped', blocked: new Set(ACTION_IDS) };
const REPO_SAID_NO: HardStop = { kind: 'repo_said_no', blocked: new Set<ActionId>(['start_run']) };

/**
 * What stops our work on a contribution's pull request: a maintainer stopped GitRanks work on it (every control that
 * writes to it), or the repo said no to AI-made PRs (no new run). The maintainer's stop wins when both hold. `first`
 * may be unknown (a run read on its own): then only the maintainers' say decides. A suspended account is never one.
 */
export function hardStopOf({
  first,
  prNotes,
}: {
  first?: ContributeAttemptDetail;
  prNotes?: ContributePrNotes;
}): HardStop | null {
  if (prNotes?.stopped) return MAINTAINER_STOPPED;
  if (repoSaidNoOf(first?.needsYou?.signals)) return REPO_SAID_NO;
  return null;
}
