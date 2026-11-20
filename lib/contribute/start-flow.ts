import type { Route } from 'next';

import type { ContributeIssueKind, ContributeLanguage, ContributePreferences } from '@/lib/workspace/contribute.types';
import { KINDS, LANGUAGES } from '@/lib/workspace/format';

/**
 * What a visitor picked on What you work on, carried in the address from step to step and through the GitHub sign-in
 * (getting in, §6.1): `?languages=rust,js_ts&kinds=bug,tests`, the names in lower case. Nothing is kept anywhere else.
 */
export type WorkPicks = { languages: ContributeLanguage[]; kinds: ContributeIssueKind[] };

type Query = Record<string, string | string[] | undefined> | URLSearchParams;

const paramOf = (query: Query, name: string): string | undefined => {
  if (query instanceof URLSearchParams) return query.get(name) ?? undefined;
  const value = query[name];
  return Array.isArray(value) ? value[0] : value;
};

/** The known names of one list, in the table's order, each once; anything else is dropped. */
function namesOf<T extends string>(value: string | undefined, table: Record<T, string>): T[] {
  const asked = new Set((value ?? '').split(',').map((name) => name.trim().toUpperCase()));
  return (Object.keys(table) as T[]).filter((name) => asked.has(name));
}

/** The picks an address carries; an unknown name, an empty list or a missing one is none. */
export function workPicksOf(query: Query): WorkPicks {
  return {
    languages: namesOf(paramOf(query, 'languages'), LANGUAGES),
    kinds: namesOf(paramOf(query, 'kinds'), KINDS),
  };
}

/** Whether the address carries any pick. */
export const hasPicks = (picks: WorkPicks): boolean => picks.languages.length > 0 || picks.kinds.length > 0;

/** The query that carries the picks (`languages=…&kinds=…`, empty lists left out); empty for none. */
export function workPicksQuery(picks: WorkPicks): string {
  const query = new URLSearchParams();
  if (picks.languages.length) query.set('languages', picks.languages.map((name) => name.toLowerCase()).join(','));
  if (picks.kinds.length) query.set('kinds', picks.kinds.map((name) => name.toLowerCase()).join(','));
  // The lists' commas read better left as they are; every name is letters and `_`.
  return query.toString().replaceAll('%2C', ',');
}

/** A step's address with the picks in its query. */
export function withWorkPicks(path: Route, picks: WorkPicks): Route {
  const query = workPicksQuery(picks);
  return (query ? `${path}?${query}` : path) as Route;
}

/**
 * The picks What you work on starts from (§5.4, §6.2): a visitor's are the address's. Signed in, saved preferences show
 * as saved, whatever the address says (a saved answer is never overwritten by an address); with none saved, the
 * address's picks, the languages otherwise pre-ticked from their profile (`profile`, none when unread).
 */
export function workStartPicksOf({
  signedIn,
  saved,
  address,
  profile,
}: {
  signedIn: boolean;
  saved: Pick<ContributePreferences, 'languages' | 'kinds'> | null | undefined;
  address: WorkPicks;
  profile: readonly ContributeLanguage[];
}): WorkPicks {
  if (!signedIn) return address;
  if (saved) return { languages: [...saved.languages], kinds: [...saved.kinds] };
  return { languages: address.languages.length ? address.languages : [...profile], kinds: address.kinds };
}

/** Whether the profile's languages are asked for: signed in, nothing saved, and no languages in the address. */
export const needsProfileLanguages = (signedIn: boolean, saved: unknown, address: WorkPicks): boolean =>
  signedIn && !saved && !address.languages.length;

const MATCH = 'These open issues match what you work on:';

/**
 * Your first issue's line, by what is connected (§5.6): the own agent by its name (`agent`, "Your agent" when unknown),
 * the Claude key, or both.
 */
export function firstIssueLineOf(agents: { hosted: boolean; own: boolean }, agent: string | null): string {
  if (agents.hosted && agents.own) {
    return `Your agents are connected. ${MATCH} press Start on one and choose who works on it.`;
  }
  if (agents.hosted)
    return `Your Claude key is connected. ${MATCH} press Start on one, and the hosted agent begins at once.`;
  return `${agent ?? 'Your agent'} is connected. ${MATCH} press Start on one, and you get one prompt to paste in your agent.`;
}
