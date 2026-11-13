import type { ContributeSetRepo, ContributeSetSkipKind } from './contribute.types';
import { plural } from './set-format';

/** How many kinds the line names; the rest are summed as "other". */
const KINDS_SHOWN = 3;

/** Each skip kind as the line says it, for one issue and for several. */
const KIND_WORDS: Record<ContributeSetSkipKind, [one: string, many: string]> = {
  HAS_PR: ['already has a PR', 'already have a PR'],
  TAKEN: ['taken by someone', 'taken by someone'],
  DECLINED: ['turned down by maintainers', 'turned down by maintainers'],
  NO_GO_AHEAD: ['no maintainer go-ahead', 'no maintainer go-ahead'],
  UNCLEAR: ['too short or unclear', 'too short or unclear'],
  OLD: ['too old or quiet', 'too old or quiet'],
  NOT_AGENT_WORK: ['not agent work', 'not agent work'],
};

const kindText = (kind: ContributeSetSkipKind, count: number) =>
  `${count.toLocaleString('en-US')} ${KIND_WORDS[kind][count === 1 ? 0 : 1]}`;

/**
 * Why an active repo on a list shows no issues, as one grey line under its row: "14 open issues, none pass our
 * checks: 9 too short or unclear, 3 no maintainer go-ahead, 2 already have a PR". Null when the API sent nothing (the
 * repo has issues in the pool, or is not read yet).
 */
export function setRepoEmptyLineOf(repo: Pick<ContributeSetRepo, 'status' | 'issues'>): string | null {
  const issues = repo.status === 'ACTIVE' ? repo.issues : null;
  if (!issues) return null;
  if (issues.open === 0) return 'No open issues right now';
  const open = plural(issues.open, 'open issue');
  if (issues.waiting === issues.open) return `${open}, still being sorted`;
  const shown = issues.skipped.slice(0, KINDS_SHOWN).map(({ kind, count }) => kindText(kind, count));
  const other = issues.skipped.slice(KINDS_SHOWN).reduce((sum, { count }) => sum + count, 0);
  const parts = [
    ...shown,
    ...(other ? [`${other.toLocaleString('en-US')} other`] : []),
    ...(issues.waiting ? [`${issues.waiting.toLocaleString('en-US')} still being sorted`] : []),
  ];
  // Some still sorted: none is ready yet, not "none pass".
  const none = issues.waiting
    ? 'none ready yet'
    : issues.open === 1
      ? "it doesn't pass our checks"
      : 'none pass our checks';
  return parts.length ? `${open}, ${none}: ${parts.join(', ')}` : `${open}, ${none}`;
}
