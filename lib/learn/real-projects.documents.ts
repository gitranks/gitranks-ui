import { parse } from 'graphql';

import type DocumentNode from '@/types/typed-document-node';

/*
 * What tells whether a lesson's or a course's view in real projects is made: how many listed merged fixes used it, and
 * the open issues of the shared list for it, by their ids alone. Two operations, so either fails alone. Both are the
 * same for everyone and read live.
 */

const doc = <TData, TVariables extends Record<string, unknown>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

type Narrowing = { input: { lesson: string | null; course: string | null } };

/** How many listed merged fixes used the lesson or the course. */
export const RealProjectsFixesTotalDocument = doc<{ learnFixes: { total: number | null } | null }, Narrowing>(
  'query RealProjectsFixesTotal($input: LearnFixesInput!) { learnFixes(input: $input) { total } }',
);

/** The open issues every visitor sees for the lesson or the course, by id. */
export const RealProjectsOpenDocument = doc<
  { learnQueuePublic: { rows: { issue: { id: string } | null }[] | null } | null },
  Narrowing
>(
  'query RealProjectsOpen($input: LearnQueuePublicInput!) { learnQueuePublic(input: $input) { rows { issue { id } } } }',
);
