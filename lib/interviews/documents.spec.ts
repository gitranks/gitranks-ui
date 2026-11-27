import { type FieldNode, Kind, type OperationDefinitionNode, type SelectionSetNode } from 'graphql';
import { describe, expect, it } from 'vitest';

import { interviewsHome, northwindPage, tallgrassPage } from './__fixtures__/companies';
import { forAlgorithms, forCourses, forNorthwindCourse } from './__fixtures__/learn';
import {
  barMine,
  mineFull,
  myHomeTwo,
  nextAfterPart,
  nextAfterPlan,
  nextAfterRound,
  seniorFinishedReviewDue,
  seniorInProgress,
  seniorNotStarted,
  seniorRoundDone,
  seniorStopped,
  tallgrassStarted,
} from './__fixtures__/mine';
import { northwindSeniorPlan, tallgrassSrePlan } from './__fixtures__/plans';
import * as shared from './interviews.documents';
import * as mine from './mine.documents';
import * as everyone from './public.documents';

/*
 * Every Interviews document parses, and carries the operation name the API's contract gives it: the export's name
 * without "Document". The shared fields are written once, so a page asks for the same shape as the others. The
 * documents are cast to their types, so a field left out of a selection would still type-check: each document is
 * held against the fixtures of its type, and must ask for every field they hold.
 */

const documents = Object.entries({ ...shared, ...everyone, ...mine }).filter(([name]) => name.endsWith('Document'));

const operationOf = (document: unknown) =>
  (document as { definitions: OperationDefinitionNode[] }).definitions.find(
    (definition) => definition.kind === 'OperationDefinition',
  );

describe("Interviews' documents", () => {
  it('are all here: the reads, the writes, the switch, the bar, the logo and the address', () => {
    expect(documents.map(([name]) => name.replace(/Document$/, '')).sort()).toEqual(
      [
        'InterviewAddress',
        'InterviewCompany',
        'InterviewLogo',
        'InterviewNext',
        'InterviewPlan',
        'InterviewPlanMine',
        'InterviewsBar',
        'InterviewsForCourse',
        'InterviewsForCourses',
        'InterviewsHome',
        'InterviewsMine',
        'InterviewsMyHome',
        'InterviewsOpen',
        'InterviewsOpenToEveryone',
        'ReportInterviewFact',
        'StartInterviewPlan',
        'StopInterviewPlan',
      ].sort(),
    );
  });

  it.each(documents)('%s carries its operation name', (name, document) => {
    const operation = operationOf(document);
    expect(operation?.name?.value).toBe(name.replace(/Document$/, ''));
  });

  it('asks the writes as mutations and everything else as queries', () => {
    const writes = new Set(['StartInterviewPlan', 'StopInterviewPlan', 'ReportInterviewFact']);
    for (const [name, document] of documents) {
      const operation = operationOf(document);
      expect(operation?.operation).toBe(writes.has(operation?.name?.value ?? '') ? 'mutation' : 'query');
      expect(name).toBeTruthy();
    }
  });
});

/** The fields a selection set asks for, by name. */
const fieldsOf = (selection: SelectionSetNode | undefined): Map<string, FieldNode> =>
  new Map(
    (selection?.selections ?? []).flatMap((node) =>
      node.kind === Kind.FIELD ? [[node.name.value, node] as const] : [],
    ),
  );

/** The fields of an answer, as `path.to.field`, that its selection does not ask for. */
function unasked(selection: SelectionSetNode | undefined, value: unknown, at: string): string[] {
  if (value === null || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap((one) => unasked(selection, one, `${at}[]`));
  const fields = fieldsOf(selection);
  return Object.entries(value).flatMap(([key, child]) => {
    const field = fields.get(key);
    if (!field) return [`${at}.${key}`];
    return field.selectionSet ? unasked(field.selectionSet, child, `${at}.${key}`) : [];
  });
}

/** The selection under a document's one top field. */
const topOf = (document: unknown) => {
  const top = fieldsOf(operationOf(document)?.selectionSet);
  expect(top.size).toBe(1);
  return [...top.values()][0];
};

/** An item that is a project: no fixture plan has one yet, and the wire's flat item must still carry its fields. */
const projectItem = {
  type: 'project',
  key: 'build/mcp-server',
  project: { slug: 'mcp-server', name: 'MCP server' },
  steps: 16,
};

/** Each document, and answers of the shape its type gives (the fixtures the pages are built on). */
const ANSWERS: [string, unknown, unknown[]][] = [
  ['InterviewsHome', everyone.InterviewsHomeDocument, [interviewsHome]],
  ['InterviewCompany', everyone.InterviewCompanyDocument, [northwindPage, tallgrassPage]],
  [
    'InterviewPlan',
    everyone.InterviewPlanDocument,
    [
      northwindSeniorPlan,
      tallgrassSrePlan,
      { ...tallgrassSrePlan, rounds: [{ ...tallgrassSrePlan.rounds[0], items: [projectItem] }] },
    ],
  ],
  ['InterviewsForCourses', everyone.InterviewsForCoursesDocument, [forCourses]],
  ['InterviewsForCourse', everyone.InterviewsForCourseDocument, [forAlgorithms, forNorthwindCourse]],
  ['InterviewsBar', shared.InterviewsBarDocument, [barMine]],
  ['InterviewAddress', shared.InterviewAddressDocument, [{ state: 'moved', to: '/interviews/northwind' }]],
  ['InterviewsMine', mine.InterviewsMineDocument, [mineFull]],
  ['InterviewsMyHome', mine.InterviewsMyHomeDocument, [myHomeTwo]],
  [
    'InterviewPlanMine',
    mine.InterviewPlanMineDocument,
    [seniorNotStarted, seniorInProgress, seniorRoundDone, seniorFinishedReviewDue, seniorStopped, tallgrassStarted],
  ],
  ['InterviewNext', mine.InterviewNextDocument, [nextAfterPart, nextAfterRound, nextAfterPlan]],
  ['StartInterviewPlan', mine.StartInterviewPlanDocument, [seniorInProgress]],
  ['StopInterviewPlan', mine.StopInterviewPlanDocument, [seniorStopped]],
];

describe("Interviews' documents ask for every field of the wire's types", () => {
  it.each(ANSWERS)('%s asks for every field its answers hold', (_name, document, answers) => {
    const top = topOf(document);
    for (const answer of answers) expect(unasked(top.selectionSet, answer, top.name.value)).toEqual([]);
  });

  it('catches a field a selection leaves out', () => {
    const top = topOf(everyone.InterviewPlanDocument);
    const answer = { ...northwindSeniorPlan, rounds: [{ ...northwindSeniorPlan.rounds[0], extra: 1 }] };
    expect(unasked(top.selectionSet, answer, 'interviewPlan')).toEqual(['interviewPlan.rounds[].extra']);
  });
});
