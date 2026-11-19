import type { Route } from 'next';

import type {
  ContributeMcpToken,
  ContributeProof,
  ContributeProofBrief,
  ContributeProofState,
  ContributeView,
} from './contribute.types';

/**
 * Proof from the user's own agent (2026-11-03): a review bot asks for proof of the fix that only the user's machine can
 * capture. Their own agent, connected to GitRanks, captures it; the user checks it here; GitRanks posts it. Pure: the
 * cards, the rows, the tile and their specs read the same.
 */

/**
 * Where a proof stands, as its card draws it:
 * - `not-connected`, `connected`: the bot asks and no agent holds it; the user has never connected one, or has.
 * - `working`: the agent holds it, sends its screenshots, or GitRanks checks them.
 * - `review`, `cannot`, `fix-broken`: back for the user, with the proof, a reply for the pull request, or the news the
 *   fix itself does not work.
 * - `unreadable`: back for the user, but with nothing this page can show (an outcome it does not know, a proof without
 *   its section): send it back or discard it.
 * - `posting`, `failed`, `posted`: GitRanks posts it, could not, or has.
 * - `ask-cleared`: the bot no longer asks, so the proof that waited ended.
 */
export type ProofStage =
  | 'not-connected'
  | 'connected'
  | 'working'
  | 'review'
  | 'cannot'
  | 'fix-broken'
  | 'unreadable'
  | 'posting'
  | 'failed'
  | 'posted'
  | 'ask-cleared';

/** A posted proof, and one the bot's change of mind ended, stay on the page this long. */
export const PROOF_SHOWN_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** The agent holds it: its card waits for the agent, and the page asks for news often. */
export const PROOF_WORKING_STATES: ReadonlySet<ContributeProofState> = new Set(['RUNNING', 'UPLOADING', 'CHECKING']);

/** The screenshots a proof takes at most, and how big each may be. */
export const PROOF_FILES_MAX = 6;
export const PROOF_FILE_MB = 5;

/** The user's own text: the note sent back to the agent, and the reply posted on the pull request. */
export const PROOF_NOTE_MAX = 2_000;
export const PROOF_REPLY_MAX = 4_000;

const timeOf = (iso: string | null | undefined) => {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isFinite(time) ? time : null;
};

/** Within `PROOF_SHOWN_AFTER_MS` of `at` (an unknown time: shown). */
const recent = (at: string | null | undefined, now: Date) => {
  const time = timeOf(at);
  return time === null || now.getTime() - time <= PROOF_SHOWN_AFTER_MS;
};

/**
 * Where the proof stands, or null when there is nothing to show. A posted proof gives way to an ask first seen after it
 * was posted: the bot read it and asks again, so a new proof may start.
 */
export function proofStageOf(
  proof: ContributeProofBrief | ContributeProof | null | undefined,
  connected: boolean,
  now: Date,
): ProofStage | null {
  if (!proof) return null;
  const { ask, session } = proof;
  const waiting = (): ProofStage | null => (ask ? (connected ? 'connected' : 'not-connected') : null);
  if (!session) return waiting();
  if (PROOF_WORKING_STATES.has(session.state)) return 'working';
  switch (session.state) {
    case 'REVIEW': {
      const outcome = session.result?.outcome;
      if (outcome === 'CANNOT_PROVE') return 'cannot';
      if (outcome === 'FIX_BROKEN') return 'fix-broken';
      if (outcome !== 'PROVED') return 'unreadable';
      // A list reads no section: only the page's full read can tell one missing.
      const result = session.result;
      return result && 'section' in result && !result.section ? 'unreadable' : 'review';
    }
    case 'POSTING':
      return 'posting';
    case 'FAILED':
      return 'failed';
    case 'POSTED': {
      const askedAgain = ask && (timeOf(ask.at) ?? 0) > (timeOf(session.stateAt) ?? Number.POSITIVE_INFINITY);
      if (askedAgain) return waiting();
      return ask || recent(session.stateAt, now) ? 'posted' : null;
    }
    case 'DISCARDED':
      if (ask) return waiting();
      return session.endedReason === 'ASK_CLEARED' && recent(session.stateAt, now) ? 'ask-cleared' : null;
    default:
      return waiting();
  }
}

/** A stage the user, or their agent, still has to act on: the others only tell what happened. */
export const proofWaits = (stage: ProofStage | null): boolean =>
  !!stage && stage !== 'posted' && stage !== 'ask-cleared';

/**
 * Whether the bot's block on the pull request is the proof's to tell: while the proof still waits on the user or their
 * agent, or when the block was raised no later than the proof last moved. A block raised after a proof was posted (or
 * after the ask went away) is the bot's new word, told on its own.
 */
export function proofTellsBlock(
  stage: ProofStage | null,
  session: { stateAt: string | null } | null | undefined,
  blockedAt: string | null | undefined,
): boolean {
  if (!stage) return false;
  if (proofWaits(stage) || !blockedAt) return true;
  const blocked = timeOf(blockedAt);
  const moved = timeOf(session?.stateAt);
  return blocked === null || moved === null || blocked <= moved;
}

/** Whether the user's agent has ever called GitRanks: a token of theirs was used. */
export const agentConnectedOf = (view: Pick<ContributeView, 'ownAgent'> | null | undefined): boolean =>
  !!view?.ownAgent?.tokens.some((token) => token.lastUsedAt);

/** The token the user's agent used last, for "Claude Code on macOS · last used 2 hours ago". */
export const lastUsedTokenOf = (tokens: ContributeMcpToken[] | undefined): ContributeMcpToken | undefined =>
  (tokens ?? [])
    .filter((token) => token.lastUsedAt)
    .sort((a, b) => (timeOf(b.lastUsedAt) ?? 0) - (timeOf(a.lastUsedAt) ?? 0))[0];

/** The one line the user gives their agent: it reads the full brief from GitRanks. */
export const proofPromptOf = (nameWithOwner: string | null, prNumber: number): string =>
  `Prove ${nameWithOwner ? `${nameWithOwner}#${prNumber}` : `pull request #${prNumber}`} for GitRanks`;

/** The branch in the user's fork the screenshots go to. */
export const proofBranchOf = (prNumber: number): string => `gitranks-proof/${prNumber}`;

/** Where the page reads a checked screenshot: only for the proof's own user, never cached. */
export const proofFilePathOf = (proofId: string, slot: number): string =>
  `/api/me/contribute/proofs/${encodeURIComponent(proofId)}/files/${slot}`;

/** The connect page for the own-agent path, showing the proof's prompt as its last step. */
export const proofConnectPathOf = (attemptId: string): Route =>
  `/contribute/connect?path=agent&proof=${encodeURIComponent(attemptId)}` as Route;

/** `?proof=<attemptId>` on the connect page, when it names one. */
export const proofParamOf = (value: string | string[] | undefined): string | null => {
  const id = (Array.isArray(value) ? value[0] : value)?.trim();
  return id && /^[\w-]{1,64}$/.test(id) ? id : null;
};

/**
 * What the bot asks for, as a phrase after "asks for": its item's title without the verb ("Add real behavior proof" →
 * "real behavior proof"), else the title quoted.
 */
export function askedForOf(title: string): string {
  const text = title.replace(/\s+/g, ' ').trim();
  const rest = /^(?:add|provide|attach|include|show|post|share)\s+(.+)$/i.exec(text)?.[1];
  if (rest && /\bproof\b/i.test(rest)) return rest.replace(/[.!]+$/, '');
  return `proof: “${text.length > 80 ? `${text.slice(0, 79).trimEnd()}…` : text}”`;
}

/** `2 screenshots`, `1 screenshot`. */
export const screenshotsOf = (count: number): string => `${count} screenshot${count === 1 ? '' : 's'}`;

/** `412 KB`, `1.2 MB`. */
export function sizeOf(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A commit as GitHub shows it short. */
export const shortShaOf = (sha: string | null | undefined): string | null => (sha ? sha.slice(0, 8) : null);

/**
 * The proof's images as the page shows them: `proof:<slot>` names a screenshot the agent sent; anything else is no
 * image of ours. Null: leave the image out.
 */
export function proofImageSrcOf(url: string, proofId: string, slots: ReadonlySet<number>): string | null {
  const slot = /^proof:([1-9])$/.exec(url.trim())?.[1];
  return slot && slots.has(Number(slot)) ? proofFilePathOf(proofId, Number(slot)) : null;
}

/** The only image sources a proof's preview shows: its own screenshots' routes, exactly. */
export const proofImageSrcsOf = (proofId: string, slots: Iterable<number>): ReadonlySet<string> =>
  new Set([...slots].map((slot) => proofFilePathOf(proofId, slot)));
