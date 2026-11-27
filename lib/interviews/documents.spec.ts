import type { OperationDefinitionNode } from 'graphql';
import { describe, expect, it } from 'vitest';

import * as shared from './interviews.documents';
import * as mine from './mine.documents';
import * as everyone from './public.documents';

/*
 * Every Interviews document parses, and carries the operation name the API's contract gives it: the export's name
 * without "Document". The shared fields are written once, so a page asks for the same shape as the others.
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
