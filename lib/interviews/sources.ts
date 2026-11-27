import type { InterviewBasis, InterviewSource, InterviewSourceKind } from './types';

/*
 * The words around a fact's sources, as every page writes them: who states the fact, what each source is and when it
 * was published, and when the sources were read.
 */

/** Who states a fact, in one of the three wordings every page uses. */
export function basisWordsOf(basis: InterviewBasis, company: string): string {
  if (basis === 'official') return `${company} states`;
  if (basis === 'both') return `${company} and candidates`;
  return 'Candidates report';
}

/** Whether the company's own pages state the fact (the chip with a tick), or candidates alone (the quiet one). */
export const statedByCompany = (basis: InterviewBasis): boolean => basis !== 'reported';

/** What a source is, in words. */
export function sourceKindWordsOf(kind: InterviewSourceKind, company: string): string {
  switch (kind) {
    case 'official':
      return `${company}'s own page`;
    case 'handbook':
      return 'A handbook';
    case 'candidate_report':
      return "A candidate's report";
    case 'guide':
      return 'A guide';
    case 'news':
      return 'A news story';
    case 'listing':
      return 'A job listing';
    default:
      return 'A page';
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DATE = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/;

/** The parts of a date as the research writes it (`2025`, `2025-05`, `2025-05-14` or a whole ISO time); null if none. */
function partsOf(date: string | null | undefined): { year: string; month: number | null; day: number | null } | null {
  const match = date ? DATE.exec(date) : null;
  if (!match) return null;
  const month = match[2] ? Number(match[2]) : null;
  if (month !== null && (month < 1 || month > 12)) return null;
  const day = match[3] ? Number(match[3]) : null;
  if (day !== null && (day < 1 || day > 31)) return null;
  return { year: match[1], month, day };
}

/** When a source was published, as its row says it: "May 2025", or the year alone; null with no date. */
export function publishedWordsOf(published: string | null | undefined): string | null {
  const parts = partsOf(published);
  if (!parts) return null;
  return parts.month === null ? parts.year : `${MONTHS[parts.month - 1]} ${parts.year}`;
}

/** A day as the pages write it: "26 Nov 2026"; null for a value that is not a day. */
export function dayWordsOf(date: string | null | undefined): string | null {
  const parts = partsOf(date);
  if (!parts || parts.month === null || parts.day === null) return null;
  return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}`;
}

/** The words a source read only through what a search result said of it carries. How the rest were read is not said. */
export const SEARCH_SUMMARY_WORDS = 'read through search results';

/** The line under a source's title: its site, what it is, when it was published, and how it was read when that matters. */
export function sourceLineOf(source: InterviewSource, company: string): string[] {
  const published = publishedWordsOf(source.published);
  return [
    source.site,
    sourceKindWordsOf(source.kind, company),
    ...(published ? [published] : []),
    ...(source.how === 'search_summary' ? [SEARCH_SUMMARY_WORDS] : []),
  ];
}

/** A source's title, or its site when the research kept no title. */
export const sourceTitleOf = (source: InterviewSource): string => source.title?.trim() || source.site;

/** The newest day the sources were read on, as the pages write it; null with no source. */
export function readOnOf(sources: readonly InterviewSource[]): string | null {
  const newest = sources.reduce<string | null>(
    (latest, source) => (source.readAt && (!latest || source.readAt > latest) ? source.readAt : latest),
    null,
  );
  return dayWordsOf(newest);
}

/** "21 sources", "1 source". */
export const sourcesWordsOf = (count: number): string => `${count} ${count === 1 ? 'source' : 'sources'}`;

/** The sources a fact or a section names, in the order it names them; an id with no source is skipped. */
export function sourcesOf(ids: readonly string[], sources: readonly InterviewSource[]): InterviewSource[] {
  const byId = new Map(sources.map((source) => [source.id, source]));
  const seen = new Set<string>();
  return ids.flatMap((id) => {
    const source = byId.get(id);
    if (!source || seen.has(id)) return [];
    seen.add(id);
    return [source];
  });
}

/** The sources of several facts, each once, in the order the facts name them. */
export const sourcesOfFacts = (
  facts: readonly { sources: readonly string[] }[],
  sources: readonly InterviewSource[],
): InterviewSource[] =>
  sourcesOf(
    facts.flatMap((fact) => fact.sources),
    sources,
  );
