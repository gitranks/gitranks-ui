import { planCardsOf } from './company';
import { lowerFirst } from './home-search';
import {
  INTERVIEWS_HOME_CARD_PATH,
  INTERVIEWS_HOME_PATH,
  interviewCompanyCardPath,
  interviewCompanyPath,
  interviewPlanCardPath,
} from './paths';
import type { InterviewCompanyPage, InterviewCompanyRef, InterviewPlanPage, InterviewsHome } from './types';
import { clipText } from '@/lib/seo/clip-text';

/*
 * The share pictures of Interviews home, a company and a plan: what each says, where each lives, and its version.
 * Pure, so the pictures, the pages' metadata and the specs use the same rules. A picture is the same for everyone and
 * carries facts about the interview only: never a person's plans, never a count of people, never a zero.
 */

/** Interviews' picture: the landing's headline and the line under it. */
export const INTERVIEWS_CARD_HEADLINE = 'Prepare for the interview at the company you want';
export const INTERVIEWS_CARD_LINE = 'Plans that follow the real rounds, with lessons and projects for each.';

/** The label on the right of each picture's head. */
export const INTERVIEWS_CARD_EYEBROW = 'Interviews';
export const COMPANY_CARD_EYEBROW = 'Interview plans';
export const PLAN_CARD_EYEBROW = 'Interview plan';

/** How many companies' logos Interviews' picture shows: the top five. */
export const CARD_TOP_COMPANIES = 5;

/** The notice every picture of a company or a plan carries. */
export const cardNoticeOf = (company: string): string => `Not an official ${company} page`;

/** A count with its noun: "1 plan", "6 plans". */
const countOf = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** A company picture's name: "Northwind interviews". */
export const companyCardTitleOf = (company: Pick<InterviewCompanyRef, 'name'>): string =>
  `${company.name.trim()} interviews`;

/** A plan picture's name: "Northwind · Senior software engineer". */
export const planCardTitleOf = (plan: Pick<InterviewPlanPage, 'company' | 'name'>): string =>
  `${plan.company.name.trim()} · ${plan.name.trim()}`;

/** The longest name a picture draws: three lines at the smaller size. A longer one is cut with "…". */
const CARD_TITLE_MAX = 96;
/** A name up to this long takes the larger size; a longer one the smaller size, on up to three lines. */
const CARD_TITLE_LARGE_MAX = 28;

/** The name as a picture draws it, cut to three lines at the smaller size. */
export const cardTitleTextOf = (title: string): string => clipText(title.replace(/\s+/g, ' ').trim(), CARD_TITLE_MAX);

/** The name's size: a company's short name large; a plan's name, and any long name, smaller (the designs' 62 and 50). */
export const cardTitleSizeOf = (title: string, kind: 'company' | 'plan'): number =>
  kind === 'company' && title.length <= CARD_TITLE_LARGE_MAX ? 62 : 50;

/** A company picture's line: "6 plans for 3 positions"; null with no plan. */
export function companyCardLineOf(page: Pick<InterviewCompanyPage, 'positions'>): string | null {
  const plans = planCardsOf(page).length;
  const positions = page.positions.filter((one) => one.plans.length > 0).length;
  if (plans < 1 || positions < 1) return null;
  return `${countOf(plans, 'plan', 'plans')} for ${countOf(positions, 'position', 'positions')}`;
}

/** A round's title inside a sentence: "the recruiter call". */
const roundInSentence = (title: string): string => `the ${lowerFirst(title.replace(/\s+/g, ' ').trim())}`;

/**
 * A plan picture's line, its rounds in one line: "5 rounds, from the recruiter call to the values interview", or
 * "1 round: the recruiter call"; null with no round.
 */
export function planCardLineOf(plan: Pick<InterviewPlanPage, 'rounds'>): string | null {
  const titles = plan.rounds.map((round) => round.title).filter((title) => title?.trim());
  const [first] = titles;
  if (!first) return null;
  if (titles.length === 1) return `1 round: ${roundInSentence(first)}`;
  const last = titles[titles.length - 1];
  return `${titles.length} rounds, from ${roundInSentence(first)} to ${roundInSentence(last)}`;
}

/** The companies whose logos Interviews' picture shows: the top five, in order. */
export const cardTopOf = (home: Pick<InterviewsHome, 'top'>): InterviewCompanyRef[] =>
  home.top.filter((company) => company?.slug && company.name?.trim()).slice(0, CARD_TOP_COMPANIES);

/** The address printed at the foot of each picture: the page, without the scheme. A plan's is cut after the company. */
export const INTERVIEWS_CARD_ADDRESS = `gitranks.com${INTERVIEWS_HOME_PATH}`;
export const companyCardAddressOf = (company: string): string => `gitranks.com${interviewCompanyPath(company)}`;
export const planCardAddressOf = (company: string): string => `${companyCardAddressOf(company)}/…`;

/** The address's size: smaller for a long one, so it keeps to one line beside the notice. */
export const cardAddressSizeOf = (address: string): number => (address.length > 40 ? 20 : 24);

/** A short, stable hash of a text (32-bit FNV-1a), in base 36. */
function hashOf(text: string): string {
  let hash = 0x811c9dc5;
  for (let at = 0; at < text.length; at++) {
    hash ^= text.charCodeAt(at);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/** Interviews picture's version: a hash of what it draws. A change to anything it shows is a new address. */
export const interviewsCardVersionOf = (home: Pick<InterviewsHome, 'top'>): string =>
  hashOf(
    [
      'interviews',
      INTERVIEWS_CARD_HEADLINE,
      INTERVIEWS_CARD_LINE,
      ...cardTopOf(home).map((one) => `${one.slug} ${one.name} ${one.logo}`),
    ].join('\n'),
  );

/** A company picture's version. */
export const companyCardVersionOf = (page: Pick<InterviewCompanyPage, 'company' | 'positions'>): string =>
  hashOf(
    [
      'company',
      page.company.slug,
      companyCardTitleOf(page.company),
      String(page.company.logo),
      companyCardLineOf(page) ?? '',
    ].join('\n'),
  );

/** A plan picture's version. */
export const planCardVersionOf = (plan: Pick<InterviewPlanPage, 'company' | 'slug' | 'name' | 'rounds'>): string =>
  hashOf(
    [
      'plan',
      plan.company.slug,
      plan.slug,
      planCardTitleOf(plan),
      String(plan.company.logo),
      planCardLineOf(plan) ?? '',
    ].join('\n'),
  );

/** Each picture under its one current address. */
export const interviewsCardUrlOf = (home: Pick<InterviewsHome, 'top'>): string =>
  `${INTERVIEWS_HOME_CARD_PATH}?v=${interviewsCardVersionOf(home)}`;
export const companyCardUrlOf = (page: Pick<InterviewCompanyPage, 'company' | 'positions'>): string =>
  `${interviewCompanyCardPath(page.company.slug)}?v=${companyCardVersionOf(page)}`;
export const planCardUrlOf = (plan: Pick<InterviewPlanPage, 'company' | 'slug' | 'name' | 'rounds'>): string =>
  `${interviewPlanCardPath(plan.company.slug, plan.slug)}?v=${planCardVersionOf(plan)}`;
