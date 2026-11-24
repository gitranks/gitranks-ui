import 'server-only';

import { parse } from 'graphql';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type DocumentNode from '@/types/typed-document-node';

/**
 * Whether the rules about full issues a day are live: the Terms, the Privacy policy, the MCP docs, the agents' page and
 * the questions then describe them. A read of its own, never a field added to an existing query: an API that does not
 * know it yet fails this read alone, and every page keeps today's words.
 */
export const IssueRulesLiveDocument = parse('query IssueRulesLive { issueNumbers { rulesLive } }') as DocumentNode<{
  issueNumbers: { rulesLive: boolean } | null;
}>;

/** How long an answer is reused: the rules going live reaches every server within a minute. */
const ANSWER_TTL_MS = 60_000;
/** After a failed ask, the last answer holds this long before the next try. */
const RETRY_MS = 10_000;

let live: { value: boolean; at: number } | null = null;
let asking: Promise<boolean> | null = null;

/**
 * The API's answer, asked once a minute per server, one ask at a time. A failed ask (an API without the field yet, or
 * one that does not answer) keeps the last answer, not live when there is none, and tries again 10 seconds later.
 */
export function issueRulesLive(now = Date.now()): Promise<boolean> {
  if (live && now - live.at < ANSWER_TTL_MS) return Promise.resolve(live.value);
  asking ??= ask(now).finally(() => {
    asking = null;
  });
  return asking;
}

async function ask(now: number): Promise<boolean> {
  try {
    const { issueNumbers } = await graphqlDirect(IssueRulesLiveDocument, undefined, { source: 'ssr' });
    live = { value: issueNumbers?.rulesLive === true, at: now };
  } catch {
    live = { value: live?.value ?? false, at: now - ANSWER_TTL_MS + RETRY_MS };
  }
  return live.value;
}

/** Forgets the kept answer (tests). */
export function resetIssueRulesLive(): void {
  live = null;
  asking = null;
}
