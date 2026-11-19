import { describe, expect, it } from 'vitest';

import { type ByAttemptRead, byAttemptTargetOf, type IssueAttemptRef } from './by-attempt';

const read = (over: Partial<ByAttemptRead> = {}): ByAttemptRead => ({
  attemptId: 'A_1',
  kind: 'FIRST',
  mode: 'FIX',
  nameWithOwner: 'acme/widgets',
  number: 42,
  followUpOf: null,
  ...over,
});
/** The issue's newest first attempt, as the API answers it: here A_1, the repo renamed from `acme/widgets`. */
const issue = (over: Partial<IssueAttemptRef> = {}): IssueAttemptRef => ({
  attemptId: 'A_1',
  mode: 'FIX',
  repo: 'acme/gadgets',
  number: 42,
  earlier: null,
  ...over,
});
const at = (attempt: ByAttemptRead, query = '', ref: IssueAttemptRef | null = issue()) =>
  byAttemptTargetOf(attempt, ref, new URLSearchParams(query));

const PAGE = '/my/pull-requests/acme/gadgets/42';

describe('the address by attempt', () => {
  it("sends a Fix attempt to the pull request's page by the repo's current name, the whole query kept", () => {
    expect(at(read())).toBe(PAGE);
    expect(at(read(), 'resume=n0nce&session=next&move=changes')).toBe(`${PAGE}?resume=n0nce&session=next&move=changes`);
  });

  it("sends an older first attempt on the issue to its earlier page, and a run to its session under its first's", () => {
    expect(at(read({ attemptId: 'A_0' }), '', issue({ earlier: ['A_0'] }))).toBe(`${PAGE}/earlier/A_0`);
    const run = read({ attemptId: 'A_F2', kind: 'FOLLOW_UP', followUpOf: { attemptId: 'A_1' } });
    expect(at(run, 'move=reply-failed')).toBe(`${PAGE}/runs/A_F2?move=reply-failed`);
    const older = read({ attemptId: 'A_F1', kind: 'FOLLOW_UP', followUpOf: { attemptId: 'A_0' } });
    expect(at(older)).toBe(`${PAGE}/earlier/A_0/runs/A_F1`);
  });

  it('sends a Learn attempt to the view its lesson names, the lesson asked by name, a move to the next step', () => {
    const learn = read({ mode: 'LEARN' });
    const lessonAt = (query = '', view: 'pr' | 'lesson' | null = 'lesson') =>
      byAttemptTargetOf(learn, issue(), new URLSearchParams(query), view);
    expect(lessonAt()).toBe(`${PAGE}/lesson`);
    expect(lessonAt('resume=n0nce')).toBe(`${PAGE}/lesson?resume=n0nce`);
    expect(lessonAt('', 'pr')).toBe(PAGE);
    // The lesson asked for by name: view= is the address's own word, dropped on the way.
    expect(lessonAt('view=lesson', 'pr')).toBe(`${PAGE}/lesson`);
    // The next step, or a move on it: the Pull request view's next step.
    expect(lessonAt('session=next')).toBe(`${PAGE}?session=next`);
    expect(lessonAt('move=changes')).toBe(`${PAGE}?move=changes&session=next`);
    // No Lesson view (Learn closed to the viewer): the Pull request view.
    expect(lessonAt('', null)).toBe(PAGE);
    expect(lessonAt('view=lesson', null)).toBe(PAGE);
    // A Learn attempt's runs show on the pull request's page.
    const run = read({ attemptId: 'A_F2', kind: 'FOLLOW_UP', mode: undefined, followUpOf: { attemptId: 'A_1' } });
    expect(byAttemptTargetOf(run, issue({ mode: 'LEARN' }), new URLSearchParams(), 'lesson')).toBe(`${PAGE}/runs/A_F2`);
  });

  it('has no page for an attempt the issue read does not know, or a run without its first attempt', () => {
    expect(at(read(), '', null)).toBeNull();
    expect(at(read({ kind: 'FOLLOW_UP', followUpOf: null }))).toBeNull();
  });
});
