import { type LinkTrouble, UNKNOWN } from './follow-pages';
import type { ApiHeroLink, ApiHeroLinkAnswer } from './hero-links.documents';

/** Where the week a link names stands: before it, during it, after it, opted out of, or called off. */
export type HeroLinkWeek = 'upcoming' | 'live' | 'done' | 'opted-out' | 'cancelled';

/** The week an Unsung hero link names, as its pages show it. Never an address. Dates are ISO strings. */
export type HeroLink = {
  week: HeroLinkWeek;
  /** A test week made before the feature was open to everyone. */
  preview: boolean;
  startsAt: string;
  endsAt: string;
  repo: { nameWithOwner: string; description: string | null; createdAt: string | null };
  package: { registry: string; name: string };
  maintainer: { login: string; name: string | null };
  line: string;
  text: string;
  facts: { weeklyDownloads: number; contributors: number | null };
  /** GitHub's star count as last read; null when none is known. */
  stars: number | null;
  /** GitHub's star count when the week started; null before. */
  starsAtStart: number | null;
  /** Whether the Opt out button can be pressed now. */
  canOptOut: boolean;
  /** Opted out: the end of the 7 days Undo is offered; null otherwise or once they are over. */
  undoUntil: string | null;
};

/**
 * What the last press on the opt-out page did, when the week alone does not say it: `already` (they had opted out
 * before), `restored` (Undo before the week: it is on again), `undone` (Undo once the week had started: it stays empty),
 * `week-taken` (Undo, but another project has the week now), `undo-expired` (the 7 days of Undo were over).
 */
export type HeroLinkNote = 'already' | 'restored' | 'undone' | 'week-taken' | 'undo-expired';

/** `/hero-link/preview` and `/hero-link/opt-out`: the link's week, or why it cannot be shown. */
export type HeroLinkState = LinkTrouble | { kind: 'link'; link: HeroLink; note?: HeroLinkNote };

const WEEKS: Record<ApiHeroLink['state'], HeroLinkWeek> = {
  UPCOMING: 'upcoming',
  LIVE: 'live',
  DONE: 'done',
  OPTED_OUT: 'opted-out',
  CANCELLED: 'cancelled',
};

/** The week as the pages show it, field by field, so nothing else of the answer reaches a page. */
export function heroLinkOf(api: ApiHeroLink): HeroLink | null {
  const week = WEEKS[api.state];
  if (!week) return null;
  return {
    week,
    preview: api.preview === true,
    startsAt: api.startsAt,
    endsAt: api.endsAt,
    repo: {
      nameWithOwner: api.repo.nameWithOwner,
      description: api.repo.description ?? null,
      createdAt: api.repo.createdAt ?? null,
    },
    package: { registry: api.package.registry, name: api.package.name },
    maintainer: { login: api.maintainer.login, name: api.maintainer.name ?? null },
    line: api.line,
    text: api.text,
    facts: { weeklyDownloads: api.facts.weeklyDownloads, contributors: api.facts.contributors ?? null },
    stars: api.stars ?? null,
    starsAtStart: api.starsAtStart ?? null,
    canOptOut: api.canOptOut === true,
    undoUntil: api.undoUntil ?? null,
  };
}

/** A page on load: the link's week, or a link that reaches nothing. */
export function heroStateOf(api: ApiHeroLink | null): HeroLinkState {
  const link = api ? heroLinkOf(api) : null;
  return link ? { kind: 'link', link } : UNKNOWN;
}

const NOTES: Partial<Record<ApiHeroLinkAnswer['result'], HeroLinkNote>> = {
  ALREADY_OPTED_OUT: 'already',
  RESTORED: 'restored',
  UNDONE: 'undone',
  WEEK_TAKEN: 'week-taken',
  EXPIRED: 'undo-expired',
};

/** The opt-out page after a press, from its answer: the week as it now is, and what the press did. */
export function heroStateAfter(answer: ApiHeroLinkAnswer): HeroLinkState {
  if (answer.result === 'UNKNOWN') return UNKNOWN;
  const state = heroStateOf(answer.link);
  if (state.kind !== 'link') return state;
  const note = NOTES[answer.result];
  return note ? { ...state, note } : state;
}
