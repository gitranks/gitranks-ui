import type { Route } from 'next';

import type { ContributeIssueKind, ContributeLanguage } from '@/lib/workspace/contribute.types';
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
