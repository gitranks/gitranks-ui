import { parse } from 'graphql';

import type { LearnHistory, LearnMyProgress } from './my-progress';
import type DocumentNode from '@/types/typed-document-node';

/*
 * My progress's two reads, each the signed-in person's own: the page (the boxes and the courses), and a page of History.
 */

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const LINK = 'slug title';
const CARD = 'slug name kind covers languages lessons numbers { learners goodShare }';
const DAY = `day lessons reviews learned { ${LINK} } repeated { ${LINK} }`;

/** My progress: lessons by depth, the days of the last 26 weeks, every day counted, the courses started. */
export const LearnMyProgressDocument = doc<{ learnMyProgress: LearnMyProgress | null }>(
  `query LearnMyProgress {
    learnMyProgress {
      learned practised mastered known
      days { ${DAY} }
      activeDays
      courses { course { ${CARD} } learned practised mastered known due next { ${LINK} } finishedAt }
    }
  }`,
);

/** A page of History: the days with something done before `before` (a local date), newest first. */
export const LearnHistoryDocument = doc<{ learnHistory: LearnHistory | null }, { before: string | null }>(
  `query LearnHistory($before: String) { learnHistory(before: $before) { days { ${DAY} } more } }`,
);
