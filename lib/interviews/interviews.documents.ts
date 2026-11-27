import { parse } from 'graphql';

import type { InterviewAddress, InterviewsBar } from './types';
import type DocumentNode from '@/types/typed-document-node';

/*
 * Interviews' switch, bar, logo and address, and the fields every Interviews read selects, written once here so every
 * document asks for the same shape (`types.ts`). A union of the wire (an item: lessons or a project) is one object
 * with a `type` and the fields of every type, null where a type has none.
 */

export const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/** A company as every page names it. */
export const COMPANY_REF = 'slug name logo';
/** A position. */
export const POSITION = 'slug name';
/** One source of the facts. */
export const SOURCE = 'id url site title kind published readAt says how';
/** A fact. */
export const FACT = 'key name value note basis sources';
/** One thing a round offers, lessons or a project. */
export const ITEM = 'type key course { slug name } group { slug name } lessons first project { slug name } steps';
/** One round of a plan. */
export const ROUND = `number kind title count minutes ai checks format notes basis sources thin key items { ${ITEM} }`;
/** A plan as a card or a row shows it. */
export const PLAN_CARD = `company { ${COMPANY_REF} } slug name position { ${POSITION} } levels levelNames roundCount
  lessons projects`;
/** One plan for the person. */
export const PLAN_MINE = `state startedAt finishedAt stoppedAt here learnedBefore
  rounds { key number state items { key done of next lessons { slug done } } }
  next { round item lesson } reviewDue justDone`;
/** One of the person's plans as a row. */
export const PLAN_ROW = `plan { ${PLAN_CARD} } state finishedAt workedAt here justDone rounds { key state }
  next { round roundName item itemName lessons lesson }`;

/** Whether Interviews is open to the signed-in person. */
export const InterviewsOpenDocument = doc<{ interviewsOpen: boolean | null }>(
  'query InterviewsOpen { interviewsOpen }',
);

/** Whether Interviews is open to everyone: asked with no viewer. */
export const InterviewsOpenToEveryoneDocument = doc<{ interviewsOpenToEveryone: boolean | null }>(
  'query InterviewsOpenToEveryone { interviewsOpenToEveryone }',
);

/** Interviews' bar for the signed-in person; null when Interviews is not open to them. */
export const InterviewsBarDocument = doc<{ interviewsBar: InterviewsBar | null }>(
  'query InterviewsBar { interviewsBar { mine } }',
);

/** One logo file of a company, by size (64, 128, 256), as base64 PNG; null with no logo. The same for everyone. */
export const InterviewLogoDocument = doc<{ interviewLogo: string | null }, { company: string; size: number }>(
  'query InterviewLogo($company: String!, $size: Int!) { interviewLogo(company: $company, size: $size) }',
);

/** Where a company's address (no plan) or a plan's stands. The same for everyone. */
export const InterviewAddressDocument = doc<
  { interviewAddress: InterviewAddress | null },
  { company: string; plan: string | null }
>(
  'query InterviewAddress($company: String!, $plan: String) { interviewAddress(company: $company, plan: $plan) { state to } }',
);
