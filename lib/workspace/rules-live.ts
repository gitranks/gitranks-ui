import 'server-only';

import { parse } from 'graphql';

import { contributeErrorOf } from './errors';
import { type IssueRules, RULES_BEFORE } from './fair-use';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type DocumentNode from '@/types/typed-document-node';

/**
 * Whether the rules about full issues a day are live, and the date of the Terms that describe them: the Terms, the
 * Privacy policy, the MCP docs, the agents' page, the questions and the old Start page address follow it. A read of
 * its own, never a field added to an existing query: an API that does not know it yet fails this read alone, and every
 * page keeps today's words.
 */
export const IssueRulesLiveDocument = parse(
  'query IssueRulesLive { issueNumbers { rulesLive termsDate } }',
) as DocumentNode<{
  issueNumbers: { rulesLive: boolean; termsDate: string | null } | null;
}>;

/**
 * How long an answer is reused. The API keeps its numbers for 5 minutes, so a change of the rules can take up to about
 * 6 minutes to reach every server.
 */
const ANSWER_TTL_MS = 60_000;
/** After a failed ask, a kept answer holds this long before the next try. */
const RETRY_MS = 10_000;

let kept: { rules: IssueRules; at: number } | null = null;
let asking: Promise<IssueRules> | null = null;

/**
 * The API's answer, asked once a minute per server, one ask at a time. Live needs a date: live without one is not live.
 * An API that does not know the read yet answers the rules of today, kept a minute. Any other failure returns the kept
 * answer and tries again 10 seconds later; with none kept it is `unknown`, kept for nobody, and the next request asks
 * again.
 */
export function issueRules(now = Date.now()): Promise<IssueRules> {
  if (kept && now - kept.at < ANSWER_TTL_MS) return Promise.resolve(kept.rules);
  asking ??= ask(now).finally(() => {
    asking = null;
  });
  return asking;
}

/** Whether the rules about full issues a day are live; false while unknown (the old Start page address reads as today). */
export async function issueRulesLive(now = Date.now()): Promise<boolean> {
  return (await issueRules(now)).state === 'live';
}

async function ask(now: number): Promise<IssueRules> {
  try {
    const { issueNumbers } = await graphqlDirect(IssueRulesLiveDocument, undefined, { source: 'ssr' });
    const termsDate = issueNumbers?.termsDate;
    const rules: IssueRules =
      issueNumbers?.rulesLive === true && termsDate ? { state: 'live', termsDate } : RULES_BEFORE;
    kept = { rules, at: now };
    return rules;
  } catch (failure) {
    if (contributeErrorOf(failure).error === 'NOT_AVAILABLE_YET') {
      kept = { rules: RULES_BEFORE, at: now };
      return RULES_BEFORE;
    }
    if (!kept) return { state: 'unknown' };
    kept = { rules: kept.rules, at: now - ANSWER_TTL_MS + RETRY_MS };
    return kept.rules;
  }
}

/** Forgets the kept answer (tests). */
export function resetIssueRulesLive(): void {
  kept = null;
  asking = null;
}
