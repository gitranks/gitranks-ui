import type {
  InterviewCompanyCard,
  InterviewCompanyRef,
  InterviewPlanCard,
  InterviewPosition,
  InterviewsHome,
} from './types';

/*
 * The search of Interviews home, run in the browser over the home read. Typing offers tags of two kinds: a company
 * (by its name or one of its other names) and a position. Capital letters and accents never matter, and the typed
 * letters must start a word. A chosen position stays in the field as a chip and turns the list into the plans for
 * it across companies; a company chosen while a position is there stays as a second chip, and the two narrow the
 * list together. A company chosen alone opens its page. The list changes when a tag is chosen, not on every letter.
 */

/** A tag the search offers: a company or a position. */
export type HomeTag =
  | { kind: 'company'; company: InterviewCompanyRef }
  | { kind: 'position'; position: InterviewPosition };

/** The tags in the field: at most one of each kind. */
export type HomeChosen = { position: InterviewPosition | null; company: InterviewCompanyRef | null };

/** Nothing chosen: the list is the companies. */
export const NOTHING_CHOSEN: HomeChosen = { position: null, company: null };

/** The query of the address that keeps the chosen position. */
export const HOME_POSITION_QUERY = 'position';

/** The companies the list shows before "All N companies": the first twelve, in the read's order. */
export const HOME_COMPANIES_SHOWN = 12;

/** The most suggestions under the field. */
export const HOME_SUGGESTIONS_MAX = 8;

const MARK = /\p{M}/u;
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The typed words, trimmed and with single spaces; empty for nothing typed. */
export const homeQueryOf = (raw: string | null | undefined) => (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);

/** A text with its accents dropped, and where each letter left came from in the text (`from[i]`). */
function foldedOf(text: string): { folded: string; from: number[] } {
  let folded = '';
  const from: number[] = [];
  let index = 0;
  for (const char of text) {
    for (const part of char.normalize('NFD')) {
      if (MARK.test(part)) continue;
      folded += part;
      for (let unit = 0; unit < part.length; unit += 1) from.push(index);
    }
    index += char.length;
  }
  return { folded, from };
}

/**
 * Where the typed letters start a word of the text, in the text's own indexes: "da" finds "Datadog" and "Data
 * engineer", "zur" finds "Zürich", and "dog" finds nothing in "Datadog". Null when they start no word.
 */
export function wordStartOf(text: string, query: string): { start: number; end: number } | null {
  const q = foldedOf(homeQueryOf(query)).folded;
  if (!q) return null;
  const { folded, from } = foldedOf(text);
  const match = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRegExp(q)})`, 'iu').exec(folded);
  if (!match) return null;
  const at = match.index + match[1].length;
  const last = at + match[2].length - 1;
  let end = from[last] + 1;
  // The end takes the whole last letter, and the accents after it.
  while (end < text.length && (text.charCodeAt(end) & 0xfc00) === 0xdc00) end += 1;
  while (end < text.length && MARK.test(text[end])) end += 1;
  return { start: from[at], end };
}

/** A name cut where the search matched it, so the typed letters can be marked; the name whole when it did not. */
export type MarkedName = { before: string; mark: string; after: string };

const markedOf = (text: string, query: string): MarkedName => {
  const match = wordStartOf(text, query);
  return match
    ? { before: text.slice(0, match.start), mark: text.slice(match.start, match.end), after: text.slice(match.end) }
    : { before: text, mark: '', after: '' };
};

/** Whether a company is found by the typed letters: its name, or one of its other names. */
export const companyMatches = (card: InterviewCompanyCard, query: string): boolean =>
  [card.company.name, ...card.otherNames].some((name) => wordStartOf(name, query) !== null);

/** The plans of a company the chosen tags keep. */
const plansKept = (card: InterviewCompanyCard, chosen: HomeChosen): InterviewPlanCard[] =>
  chosen.company && chosen.company.slug !== card.company.slug
    ? []
    : card.plans.filter((plan) => !chosen.position || plan.position.slug === chosen.position.slug);

/**
 * One suggestion under the field: the tag, its name marked where the letters matched, and how many plans it has
 * with the tags already chosen (`companies`: across how many companies, for a position).
 */
export type HomeSuggestion = { tag: HomeTag; name: MarkedName; plans: number; companies: number };

const keyOf = (tag: HomeTag) =>
  tag.kind === 'company' ? `company:${tag.company.slug}` : `position:${tag.position.slug}`;
/** A tag's identity, for lists and the lit suggestion. */
export const homeTagKeyOf = keyOf;

/**
 * What the typed letters offer, with the tags already chosen: the companies first, in the read's order, then the
 * positions. A tag with no plan under the chosen ones is not offered, and a tag already chosen is not offered again.
 * Nothing typed offers nothing.
 */
export function homeSuggestionsOf(home: InterviewsHome, query: string, chosen: HomeChosen): HomeSuggestion[] {
  const q = homeQueryOf(query);
  if (!q) return [];
  const companies = home.companies.flatMap((card): HomeSuggestion[] => {
    if (chosen.company?.slug === card.company.slug || !companyMatches(card, q)) return [];
    const plans = plansKept(card, { ...chosen, company: null }).length;
    return plans
      ? [{ tag: { kind: 'company', company: card.company }, name: markedOf(card.company.name, q), plans, companies: 1 }]
      : [];
  });
  const positions = home.positions.flatMap((position): HomeSuggestion[] => {
    if (chosen.position?.slug === position.slug || !wordStartOf(position.name, q)) return [];
    const kept = homePlansOf(home, { ...chosen, position });
    if (!kept.length) return [];
    const companyCount = new Set(kept.map((plan) => plan.company.slug)).size;
    return [
      {
        tag: { kind: 'position', position },
        name: markedOf(position.name, q),
        plans: kept.length,
        companies: companyCount,
      },
    ];
  });
  return [...companies, ...positions].slice(0, HOME_SUGGESTIONS_MAX);
}

/** The plans the chosen tags keep, across companies in the read's order, each company's in its own order. */
export function homePlansOf(home: InterviewsHome, chosen: HomeChosen): InterviewPlanCard[] {
  return home.companies.flatMap((card) => plansKept(card, chosen));
}

/**
 * What choosing a tag does: a company with no position chosen opens its page (`open`); anything else becomes a chip,
 * a position in place of the one before. A company chip stays beside a new position: the positions offered were
 * counted with it, so it has a plan for each.
 */
export function chooseHomeTag(
  chosen: HomeChosen,
  tag: HomeTag,
): { open: InterviewCompanyRef | null; chosen: HomeChosen } {
  if (tag.kind === 'position') return { open: null, chosen: { ...chosen, position: tag.position } };
  return chosen.position ? { open: null, chosen: { ...chosen, company: tag.company } } : { open: tag.company, chosen };
}

/** The chips with one taken out of the field. */
export const dropHomeTag = (chosen: HomeChosen, kind: HomeTag['kind']): HomeChosen =>
  kind === 'position' ? { ...chosen, position: null } : { ...chosen, company: null };

/** What the list under the field is: the companies, or the plans the chips keep. */
export type HomeList =
  | { kind: 'companies'; companies: InterviewCompanyCard[]; hidden: number }
  | { kind: 'plans'; title: string; plans: InterviewPlanCard[] };

/** "a site reliability engineer", "an engineering manager": a position in running text. */
export function positionInTextOf(position: InterviewPosition): string {
  const words = lowerFirst(position.name);
  return `${/^[aeiou]/i.test(words) ? 'an' : 'a'} ${words}`;
}

/** A name with its first letter small, unless the word is written in capitals ("AI engineer" stays). */
export function lowerFirst(name: string): string {
  const [first, second] = Array.from(name);
  if (!first || (second && second !== second.toLowerCase())) return name;
  return first.toLowerCase() + name.slice(first.length);
}

/**
 * The list the field turns into. Nothing chosen: the companies, the first twelve unless `all`, with how many are
 * hidden. A chip chosen: the plans it keeps, under a title that names the chips.
 */
export function homeListOf(home: InterviewsHome, chosen: HomeChosen, all = false): HomeList {
  if (!chosen.position && !chosen.company) {
    const companies = all ? home.companies : home.companies.slice(0, HOME_COMPANIES_SHOWN);
    return { kind: 'companies', companies, hidden: home.companies.length - companies.length };
  }
  const forWhom = chosen.position ? ` for ${positionInTextOf(chosen.position)}` : '';
  const at = chosen.company ? ` at ${chosen.company.name}` : '';
  return { kind: 'plans', title: `Plans${forWhom}${at}`, plans: homePlansOf(home, chosen) };
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The line on the right of the field, saying what was found, never a zero. While typing: how many companies and
 * positions the letters offer, or "No company or position". With chips: how many plans they keep, and at how many
 * companies when no company is chosen. Empty with nothing typed and nothing chosen.
 */
export function homeFieldLineOf(home: InterviewsHome, query: string, chosen: HomeChosen): string {
  if (homeQueryOf(query)) {
    const found = homeSuggestionsOf(home, query, chosen);
    const companies = found.filter((one) => one.tag.kind === 'company').length;
    const positions = found.length - companies;
    const parts = [
      companies ? count(companies, 'company', 'companies') : '',
      positions ? count(positions, 'position', 'positions') : '',
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'No company or position';
  }
  if (!chosen.position && !chosen.company) return '';
  const plans = homePlansOf(home, chosen);
  if (!plans.length) return '';
  if (chosen.company) return count(plans.length, 'plan', 'plans');
  const companies = new Set(plans.map((plan) => plan.company.slug)).size;
  return `${count(plans.length, 'plan', 'plans')} at ${count(companies, 'company', 'companies')}`;
}

/** What a suggestion says on its right: "company · 5 plans", "position · 3 plans at 3 companies". */
export function suggestionLineOf(suggestion: HomeSuggestion): string {
  const plans = count(suggestion.plans, 'plan', 'plans');
  if (suggestion.tag.kind === 'company') return `company · ${plans}`;
  return `position · ${plans} at ${count(suggestion.companies, 'company', 'companies')}`;
}

/** The position an address keeps (`?position=<slug>`), when the home has it; none otherwise. */
export function homeChosenOfAddress(home: InterviewsHome, search: string): HomeChosen {
  const slug = new URLSearchParams(search).get(HOME_POSITION_QUERY);
  const position = slug ? (home.positions.find((one) => one.slug === slug) ?? null) : null;
  return { position, company: null };
}

/** The query the address keeps for the chosen tags: the position alone, or nothing. */
export function homeAddressQueryOf(chosen: HomeChosen): string {
  return chosen.position ? `?${HOME_POSITION_QUERY}=${encodeURIComponent(chosen.position.slug)}` : '';
}
