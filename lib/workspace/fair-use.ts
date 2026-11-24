import type { Route } from 'next';

import type { ContributeFairUseNotice, ContributeFairUsePr } from './contribute.types';

/** The anchor of Contribute's rule for pull requests on issues from a contributor's list, in the Terms of service. */
export const CONTRIBUTE_RULES_ID = 'contribute-rules';
/** Where every message about fair use sends the user to read the rule. */
export const CONTRIBUTE_RULES_PATH = `/terms#${CONTRIBUTE_RULES_ID}` as Route;

/** A fair-use notice's answer page. */
export const fairUseAnswerPathOf = (noticeId: string): Route =>
  `/contribute/answer/${encodeURIComponent(noticeId)}` as Route;

/** The longest answer the API takes. */
export const FAIR_USE_ANSWER_MAX = 2_000;

/** A notice id as the API gives them: anything else is no notice of the user's, and is never asked about. */
const NOTICE_ID = /^[A-Za-z0-9_=+/-]{1,100}-(?:outsidePr|viewing|outsideFix|claimRatio)-[123]-\d{1,6}$/;

/** The rules of today, each with three steps: an email, 5 full issues a day, access closed. */
const STEP_RULES: readonly ContributeFairUseNotice['rule'][] = ['OUTSIDE_FIX', 'CLAIM_RATIO'];

/**
 * Whether a message closed the user's access under one of today's rules: its answer is a request to look again
 * ("Ask us to look again"), not an answer to the message.
 */
export const isAccessClosed = (notice: Pick<ContributeFairUseNotice, 'rule' | 'phase'>): boolean =>
  STEP_RULES.includes(notice.rule) && notice.phase >= 3;

/** The words of the way to ask us to look again at a closed access. */
export const ASK_AGAIN = 'Ask us to look again';

/** The notice id an address names, as the API gives them; null for anything else. */
export function fairUseNoticeIdOf(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  let id = value.trim();
  // The router hands the segment over as it was sent: an id holds no `%`, so one there is an escape.
  if (id.includes('%')) {
    try {
      id = decodeURIComponent(id);
    } catch {
      return null;
    }
  }
  return NOTICE_ID.test(id) ? id : null;
}

/** A piece of a message: its words, a pull request it names (a link to GitHub), or "tell us here" (its answer page). */
export type FairUseMessagePart =
  | { kind: 'text'; text: string }
  | { kind: 'pr'; text: string; url: string }
  | { kind: 'answer'; text: string };

/** The words in a message that mean its answer page. */
const ANSWER_WORDS = ['tell us here', 'answer here'];

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A message as the API words it, cut into its pieces: the pull requests it names by name, and the words that mean its
 * answer page. The words are never changed, only marked.
 */
export function fairUseMessagePartsOf(text: string, prs: readonly ContributeFairUsePr[] | null | undefined) {
  const byName = new Map((prs ?? []).filter(({ name, url }) => name && url).map((pr) => [pr.name, pr.url]));
  const marks = [...byName.keys(), ...ANSWER_WORDS].sort((a, b) => b.length - a.length);
  const parts: FairUseMessagePart[] = [];
  for (const piece of text.split(new RegExp(`(${marks.map(escapeRegExp).join('|')})`))) {
    if (!piece) continue;
    const url = byName.get(piece);
    if (url) parts.push({ kind: 'pr', text: piece, url });
    else if (ANSWER_WORDS.includes(piece)) parts.push({ kind: 'answer', text: piece });
    else parts.push({ kind: 'text', text: piece });
  }
  return parts;
}

/** The Terms banner's words as a title (its first sentence, without the full stop) and what follows it. */
export function rulesBannerPartsOf(text: string): { title: string | null; rest: string } {
  const match = /^(.+?)\.\s+(\S[\s\S]*)$/.exec(text.trim());
  return match ? { title: match[1], rest: match[2] } : { title: null, rest: text.trim() };
}

/** The answer page's label over the text box, by the message's step: an addition to a choice, or the answer itself. */
export function fairUseTextLabelOf(notice: Pick<ContributeFairUseNotice, 'phase' | 'choices'>): {
  label: string;
  optional: boolean;
} {
  if (notice.choices.length) return { label: 'Anything to add', optional: true };
  if (notice.phase >= 3) return { label: 'If this is a mistake, tell us why', optional: false };
  return { label: 'Tell us what is in your way', optional: false };
}

/** A choice as the answer page shows it: the API's words, the first letter capitalised. */
export const choiceLabelOf = (label: string) => label.charAt(0).toUpperCase() + label.slice(1);
