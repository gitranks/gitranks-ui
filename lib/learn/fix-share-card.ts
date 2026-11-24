import { SOCIAL_CARD_SIZE } from '@/badge/v3/links';
import { clipText } from '@/lib/seo/clip-text';
import { absoluteUrl } from '@/lib/seo/site';
import type { PrRef } from '@/lib/workspace/pr-feedback';
import { prTimelineCardPath, prTimelinePath } from '@/lib/workspace/pr-timeline-path';
import type { LearnFixMade, LearnIssueLesson } from '@/lib/workspace/pull-request-page.types';

/*
 * The picture a posted link to a fix shows, one for each pull request with a public page: its state, the project and
 * the issue, the title, who fixed it with which agent, and when it merged or that it waits for review. Pure and free
 * of server reads, so the card, the page's metadata and the design catalogue use the same rules. It never shows an
 * answer or a number of tries, and while Learn is not open to everyone it names no lesson. No zero.
 */

/** Where a fix stands. A closed pull request has no picture of its own. */
export type LearnFixCardState = 'OPEN' | 'MERGED' | 'CLOSED';

/** A fix as the API answers it for its public pages, the parts its picture reads. */
export type LearnFixCard = {
  /** `owner/name`. */
  repo: string;
  issueNumber: number;
  /** The pull request's number. */
  number: number;
  state: LearnFixCardState;
  made: LearnFixMade;
  /** The fixer's login. */
  fixer: string;
  lesson: LearnIssueLesson | null;
  /** The pull request's title; null when it is not known. */
  title: string | null;
  /** The agent that wrote the fix, as a page names it ("Claude Code"); null when it never said. */
  agent: string | null;
  /** When the pull request merged (ISO); null while it has not. */
  mergedAt: string | null;
};

/** A fix's picture is drawn for a merged or an open pull request only. */
export const hasFixCard = (fix: Pick<LearnFixCard, 'state'>) => fix.state === 'MERGED' || fix.state === 'OPEN';

/** The pull request a fix is. */
export const fixPrOf = (fix: Pick<LearnFixCard, 'repo' | 'number'>): PrRef => ({
  nameWithOwner: fix.repo,
  number: fix.number,
});

/** The word at the top: "Fix merged", or "Pull request open". */
export const fixCardEyebrowOf = (fix: Pick<LearnFixCard, 'state'>) =>
  fix.state === 'MERGED' ? 'Fix merged' : 'Pull request open';

/** The project and the issue's number: "harbor-kit/relay #431". */
export const fixCardProjectOf = (fix: Pick<LearnFixCard, 'repo' | 'issueNumber'>) => `${fix.repo} #${fix.issueNumber}`;

/** The project line's size: smaller for a long name, so it keeps to one line where it can. */
export const fixCardProjectSize = (project: string) => (project.length > 56 ? 20 : project.length > 44 ? 24 : 28);

/** The most a title says on the picture: three lines at its smallest size. */
const TITLE_MAX = 130;

/** The title as the picture draws it: cut at a word past 130 characters; "Pull request #N" when it is not known. */
export function fixCardTitleOf(fix: Pick<LearnFixCard, 'title' | 'number'>): string {
  const title = fix.title?.replace(/\s+/g, ' ').trim();
  return title ? clipText(title, TITLE_MAX) : `Pull request #${fix.number}`;
}

/** The title's size: smaller in two steps for a long title, so it keeps to three lines. */
export const fixCardTitleSize = (title: string) => (title.length > 80 ? 40 : title.length > 48 ? 48 : 56);

/** "with Claude Code" after the fixer; null when the agent never said. */
export const fixCardAgentOf = (fix: Pick<LearnFixCard, 'agent'>) => {
  const agent = fix.agent?.trim();
  return agent ? `with ${agent}` : null;
};

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "20 Nov 2026", in UTC; null for a time that cannot be read. */
export function fixCardDayOf(at: string | null): string | null {
  const when = at ? new Date(at) : null;
  return when && !Number.isNaN(when.getTime()) ? DAY.format(when) : null;
}

/** The line at the bottom: when it merged, or that it waits; and the lesson it used, when Learn may name it. */
export type FixCardStatus = { text: string; lesson: string | null };

export function fixCardStatusOf(
  fix: Pick<LearnFixCard, 'state' | 'mergedAt' | 'lesson'>,
  learnOpen: boolean,
): FixCardStatus {
  if (fix.state !== 'MERGED') return { text: 'Waiting for the project’s review', lesson: null };
  const day = fixCardDayOf(fix.mergedAt);
  const lesson = learnOpen ? fix.lesson?.title.trim() || null : null;
  return { text: day ? `Merged on ${day}` : 'Merged', lesson };
}

/** The address printed on the picture: the fix's "How it was made" page, without the scheme. */
export const fixCardAddressOf = (fix: Pick<LearnFixCard, 'repo' | 'number'>) =>
  `gitranks.com${prTimelinePath(fixPrOf(fix))}`;

/** The address's size: smaller in two steps for a long one, so it keeps to one line (a project's name of 100). */
export const fixCardAddressSize = (address: string) => (address.length > 84 ? 16 : address.length > 64 ? 20 : 24);

/** A short, stable hash of a text (32-bit FNV-1a), in base 36. */
function hashOf(text: string): string {
  let hash = 0x811c9dc5;
  for (let at = 0; at < text.length; at++) {
    hash ^= text.charCodeAt(at);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/** A picture's version: a hash of everything it draws, so a change to any of it is a new address. */
export function fixCardVersionOf(fix: LearnFixCard, learnOpen: boolean): string {
  const status = fixCardStatusOf(fix, learnOpen);
  return hashOf(
    [
      'fix',
      fixCardEyebrowOf(fix),
      fixCardProjectOf(fix),
      fixCardTitleOf(fix),
      fix.fixer,
      fixCardAgentOf(fix) ?? '',
      status.text,
      status.lesson ?? '',
      fixCardAddressOf(fix),
    ].join('\n'),
  );
}

/** The picture under its one current address. */
export const fixCardUrlOf = (fix: LearnFixCard, learnOpen: boolean) =>
  `${prTimelineCardPath(fixPrOf(fix))}?v=${fixCardVersionOf(fix, learnOpen)}`;

/** A posted link's title: the fix's title, then the project and the issue. */
export const fixShareTitleOf = (fix: Pick<LearnFixCard, 'title' | 'number' | 'repo' | 'issueNumber'>) =>
  `${fix.title?.replace(/\s+/g, ' ').trim() || `Pull request #${fix.number}`} · ${fixCardProjectOf(fix)}`;

/**
 * A posted link's description: "Fixed by octocat with Claude Code, merged on 20 Nov 2026. See how the fix was made.",
 * or for an open one "[...] Waiting for the project’s review. [...]".
 */
export function fixShareDescriptionOf(fix: Pick<LearnFixCard, 'fixer' | 'agent' | 'state' | 'mergedAt'>): string {
  const agent = fixCardAgentOf(fix);
  const by = `Fixed by ${fix.fixer}${agent ? ` ${agent}` : ''}`;
  if (fix.state !== 'MERGED') return `${by}. Waiting for the project’s review. See how the fix was made.`;
  const day = fixCardDayOf(fix.mergedAt);
  return `${by}, merged${day ? ` on ${day}` : ''}. See how the fix was made.`;
}

/** A fix's link preview: its picture, title and description; null without a picture (no fix, a closed one, a failed read). */
export function fixPreviewOf(read: { fix: LearnFixCard | null; learnOpen: boolean }) {
  const { fix, learnOpen } = read;
  if (!fix || !hasFixCard(fix)) return null;
  return {
    title: fixShareTitleOf(fix),
    description: fixShareDescriptionOf(fix),
    images: [{ url: absoluteUrl(fixCardUrlOf(fix, learnOpen)), ...SOCIAL_CARD_SIZE, alt: fixCardTitleOf(fix) }],
  };
}
