import 'server-only';

import { parse } from 'graphql';
import { cacheLife } from 'next/cache';

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
 * The last answer this server read, so a failed ask keeps it rather than lose it. Never the clock: a page that is
 * prerendered may call this, and the build refuses a read of the time there.
 */
let lastRead: IssueRules | null = null;

/** After a failed ask: asked again 10 seconds later, and long enough lived to be kept in a prerendered page. */
const RETRY_LIFE = { stale: 30, revalidate: 10, expire: 600 };

/**
 * The API's answer, cached across requests: kept a minute (`minutes`), so a change of the rules can take up to about
 * 6 minutes to reach every page (the API keeps its numbers for 5). Live needs a date: live without one is not live. An
 * API that does not know the read yet answers the rules of today. Any other failure answers the last answer this
 * server read, or `unknown` with none, and asks again 10 seconds later. It never throws: an error inside a cached read
 * fails a prerendered page even when its caller catches it.
 */
export async function issueRules(): Promise<IssueRules> {
  'use cache';
  try {
    const { issueNumbers } = await graphqlDirect(IssueRulesLiveDocument, undefined, { source: 'ssr' });
    const termsDate = issueNumbers?.termsDate;
    const rules: IssueRules =
      issueNumbers?.rulesLive === true && termsDate ? { state: 'live', termsDate } : RULES_BEFORE;
    lastRead = rules;
    cacheLife('minutes');
    return rules;
  } catch (failure) {
    if (contributeErrorOf(failure).error === 'NOT_AVAILABLE_YET') {
      lastRead = RULES_BEFORE;
      cacheLife('minutes');
      return RULES_BEFORE;
    }
    cacheLife(RETRY_LIFE);
    return lastRead ?? { state: 'unknown' };
  }
}

/** Whether the rules about full issues a day are live; false while unknown (the old Start page address reads as today). */
export async function issueRulesLive(): Promise<boolean> {
  return (await issueRules()).state === 'live';
}

/** Forgets the last answer read (tests). */
export function resetIssueRulesLive(): void {
  lastRead = null;
}
