import type {
  ContributeIssueKind,
  ContributeIssueSize,
  ContributeIssuesFilter,
  ContributeLanguage,
} from '@/lib/contribute/contribute.types';
import { KINDS, LANGUAGES, SIZES } from '@/lib/contribute/format';

type Params = Record<string, string | string[] | undefined>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const pick = <T extends string>(value: string | undefined, allowed: Record<T, unknown>) =>
  value && Object.hasOwn(allowed, value) ? (value as T) : undefined;

export type IssuesQuery = {
  language?: ContributeLanguage;
  kind?: ContributeIssueKind;
  size?: ContributeIssueSize;
  after?: string;
};

/** The feed's filters from the URL; anything unknown is dropped. */
export function issuesQueryOf(params: Params): IssuesQuery {
  const after = one(params.after);
  return {
    language: pick(one(params.language), LANGUAGES),
    kind: pick(one(params.kind), KINDS),
    size: pick(one(params.size), SIZES),
    ...(after && after.length <= 512 ? { after } : {}),
  };
}

export function filterOf(query: IssuesQuery): ContributeIssuesFilter {
  return {
    ...(query.language ? { languages: [query.language] } : {}),
    ...(query.kind ? { kinds: [query.kind] } : {}),
    ...(query.size ? { maxSize: query.size } : {}),
  };
}

/** The feed's URL for a query. */
export function issuesHref(query: IssuesQuery): string {
  const search = new URLSearchParams();
  if (query.language) search.set('language', query.language);
  if (query.kind) search.set('kind', query.kind);
  if (query.size) search.set('size', query.size);
  if (query.after) search.set('after', query.after);
  const text = search.toString();
  return text ? `/contribute/issues?${text}` : '/contribute/issues';
}
