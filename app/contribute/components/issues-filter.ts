import type {
  ContributeIssueKind,
  ContributeIssueSize,
  ContributeIssuesFilter,
  ContributeLanguage,
} from '@/lib/workspace/contribute.types';
import { KINDS, LANGUAGES, SIZES } from '@/lib/workspace/format';

type Params = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const pick = <T extends string>(value: string | undefined, allowed: Record<T, unknown>) =>
  value && Object.hasOwn(allowed, value) ? (value as T) : undefined;

export type IssuesQuery = {
  language?: ContributeLanguage;
  kind?: ContributeIssueKind;
  size?: ContributeIssueSize;
};

/** The feed's filters from the URL; anything unknown is dropped (an old `?after=` page among them). */
export function issuesQueryOf(params: Params): IssuesQuery {
  return {
    language: pick(one(params.language), LANGUAGES),
    kind: pick(one(params.kind), KINDS),
    size: pick(one(params.size), SIZES),
  };
}

/** Whether a filter is set. */
export const isFiltered = (query: IssuesQuery) => !!(query.language || query.kind || query.size);

export function filterOf(query: IssuesQuery): ContributeIssuesFilter {
  return {
    ...(query.language ? { languages: [query.language] } : {}),
    ...(query.kind ? { kinds: [query.kind] } : {}),
    ...(query.size ? { maxSize: query.size } : {}),
  };
}

/** The list's address for a query: the Contribute tab at its issues, the filters in the query. */
export function issuesHref(query: IssuesQuery): string {
  const search = new URLSearchParams();
  if (query.language) search.set('language', query.language);
  if (query.kind) search.set('kind', query.kind);
  if (query.size) search.set('size', query.size);
  const text = search.toString();
  return text ? `/contribute?${text}#issues` : '/contribute#issues';
}
