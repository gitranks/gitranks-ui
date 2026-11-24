import { describe, expect, it } from 'vitest';

import { learnQueueTopOf, learnQueueTopRowOf } from './learn-queue-top';
import { fullIssue, maskedIssue, maskedIssues } from '@/lib/workspace/__fixtures__/masked-issue';

const named = fullIssue();
const full = { repo: named.repo, number: named.number, url: named.url, title: named.title };

describe("the top of a learner's own list", () => {
  it('keeps a row masked, with nothing that names its issue, when the learner did not name its project', () => {
    expect(learnQueueTopRowOf({ issue: maskedIssue(), full: null })).toEqual({
      kind: 'masked',
      masked: maskedIssue(),
    });
  });

  it("names a row of a project the learner named, with its repository's language", () => {
    expect(learnQueueTopRowOf({ issue: maskedIssue(), full })).toEqual({
      kind: 'named',
      ...full,
      language: 'TypeScript',
    });
  });

  it('takes the first three rows', () => {
    const rows = [...maskedIssues, maskedIssue({ id: 'zz9' })].map((issue) => ({ issue, full: null }));
    expect(rows.length).toBeGreaterThan(3);
    expect(learnQueueTopOf(rows).map((row) => (row.kind === 'masked' ? row.masked.id : null))).toEqual(
      rows.slice(0, 3).map((row) => row.issue.id),
    );
    expect(learnQueueTopOf([])).toEqual([]);
  });
});
