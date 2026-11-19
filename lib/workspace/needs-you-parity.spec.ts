import { describe, expect, it } from 'vitest';

import type { ContributeContribution, ContributePrSignalKind } from './contribute.types';
import { repoSaidNoOf } from './follow-up-format';
import { needsYouEntryOf, needsYouWordsOf } from './needs-you-words';
import { candidatesOf } from './pr-moves';
import { prsNeedingYou, prsOutcomes, prsYours } from '@/lib/contribute/__fixtures__/needs-you';
import { facts, needsYouItem } from '@/lib/contribute/__fixtures__/pull-requests';

/**
 * Until the pull request's page reads the same facts, it words its moves itself (`candidatesOf`) and the Pull
 * requests tab words the API's items (`needsYouWordsOf`). For the kinds both say, the same pull request reads the same:
 * the API's item is built here from the fixture as the API builds it, and its pill and sentence equal the page's lead.
 */

const NOW = new Date('2026-10-28T12:00:00.000Z');

/** The signal kind each item kind is raised by. */
const SIGNAL_OF: Record<string, ContributePrSignalKind> = {
  changes: 'CHANGES_REQUESTED',
  comment: 'COMMENT',
  check: 'CHECK_FAILED',
  conversation: 'CONVERSATION',
  bot: 'BOT_BLOCKED',
  dco: 'DCO',
  title: 'TITLE',
  'repo-out': 'REPO_OUT',
  silent: 'SILENT',
};

/** The API's item for the pull request's lead, from the same data the page reads. */
function apiItemOf(pr: ContributeContribution, kind: string) {
  const signals = pr.needsYou?.signals ?? [];
  const signal = signals.find((each) => each.kind === SIGNAL_OF[kind]);
  const byHand = pr.openedBy === 'HAND';
  const repoSaidNo = repoSaidNoOf(signals);
  const detail = signal?.detail?.trim() || null;
  const issues = pr.prIssues ?? [];
  const reason = kind === 'repo-out' ? detail?.toLowerCase() : null;
  return needsYouItem({
    kind: kind.toUpperCase().replace(/-/g, '_'),
    repo: pr.nameWithOwner,
    pullRequest: { id: pr.pullRequest.prId, number: pr.pullRequest.number, url: pr.pullRequest.url },
    detail,
    facts: facts({
      noRun: byHand || repoSaidNo,
      byHand,
      repoSaidNo,
      nextRound: Math.max(pr.followUps?.used ?? 0, pr.followUps?.history?.length ?? 0) + 1,
      checks: kind === 'check' && detail ? [detail] : [],
      ruleIssues: issues.map(({ kind: issue }) => issue),
      ruleSources: issues.flatMap(({ kind: issue, source }) =>
        source?.label ? [{ kind: issue, label: source.label }] : [],
      ),
      outReason: reason === 'closed_no_ai' || reason === 'hostile_close' || reason === 'pr_misses' ? reason : null,
    }),
  });
}

describe("the list's words and the page's, for the kinds both say", () => {
  it.each([
    ['changes', prsNeedingYou.changes],
    ['comment', prsNeedingYou.comment],
    ['check', prsNeedingYou.check],
    ['title', prsNeedingYou.title],
    ['bot', prsNeedingYou.bot],
    ['dco', prsNeedingYou.dco],
    ['conversation', prsYours.conversation],
    ['repo-out', prsOutcomes.repoOut],
    ['silent', prsOutcomes.silent],
  ])('%s: the same pill and sentence', (kind, pr) => {
    const [lead] = candidatesOf({ pr, drafts: [], runs: [], now: NOW });
    expect(lead.kind).toBe(kind);
    const words = needsYouWordsOf(needsYouEntryOf(apiItemOf(pr, kind)), NOW);
    expect({ pill: words.pill, move: words.move }).toEqual({ pill: lead.pill, move: lead.move });
  });
});
