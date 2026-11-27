import type { BuildProjectCard, BuildSubject } from './types';

/*
 * The list of projects: few projects are one grid; from nine on they are grouped by subject and the page gets a
 * search. The order is ours and the same for everyone, so a project is always in the same place.
 */

/** From this many projects on, the list is grouped by subject and has a search box. */
export const PROJECTS_GROUPED_FROM = 9;

/** The subjects, in the order their groups stand, each with its heading. */
export const SUBJECTS: { subject: BuildSubject; name: string }[] = [
  { subject: 'ai', name: 'AI' },
  { subject: 'languages', name: 'Languages' },
  { subject: 'data', name: 'Data' },
  { subject: 'web', name: 'The web' },
  { subject: 'tools', name: 'Tools' },
  { subject: 'fun', name: 'For fun' },
];

/** A group of the list: its subject's heading, and its projects in our order. */
export type ProjectsGroup = { subject: BuildSubject; name: string; cards: BuildProjectCard[] };

/** Whether the list is long enough for groups and a search. */
export const isGroupedList = (cards: readonly BuildProjectCard[]) => cards.length >= PROJECTS_GROUPED_FROM;

/** The text a search looks in: a project's name and its line. */
const searchTextOf = (card: BuildProjectCard) => `${card.name}\n${card.line}`.toLowerCase();

/** Whether a project matches what was typed: every word of it, in the name or the line. */
export function matchesSearch(card: BuildProjectCard, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const text = searchTextOf(card);
  return words.every((word) => text.includes(word));
}

/** What the list shows for a search: the groups with a match (a group with none is left out), and how many. */
export type ProjectsSearch = { query: string; groups: ProjectsGroup[]; shown: number; total: number };

/**
 * The grouped list for what was typed, trimmed: every project for nothing typed. A project of a subject the list has
 * no group for is not lost: it goes to the end, under the last subject's heading.
 */
export function projectsSearchOf(cards: readonly BuildProjectCard[], typed: string): ProjectsSearch {
  const query = typed.trim();
  const found = query ? cards.filter((card) => matchesSearch(card, query)) : [...cards];
  const known = new Set(SUBJECTS.map((entry) => entry.subject));
  const groups = SUBJECTS.map(({ subject, name }) => ({
    subject,
    name,
    cards: found.filter((card) => card.subject === subject || (!known.has(card.subject) && subject === 'fun')),
  })).filter((group) => group.cards.length > 0);
  return { query, groups, shown: found.length, total: cards.length };
}

/** The count beside the search box: "14 projects", or "2 of 14 shown"; nothing when nothing matches (never a zero). */
export function projectsCountOf(search: ProjectsSearch): string {
  if (!search.query) return `${search.total} ${search.total === 1 ? 'project' : 'projects'}`;
  return search.shown ? `${search.shown} of ${search.total} shown` : '';
}
