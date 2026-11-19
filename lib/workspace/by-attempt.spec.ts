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

  it("sends a Learn attempt to its lesson, unless the link asks for the pull request's next step or a move", () => {
    const learn = read({ mode: 'LEARN' });
    expect(at(learn)).toBe('/learn/attempts/A_1');
    expect(at(learn, 'resume=n0nce')).toBe('/learn/attempts/A_1?resume=n0nce');
    expect(at(learn, 'session=next')).toBe(`${PAGE}?session=next`);
    // The page shows a Learn pull request's moves on its next step alone, and sends the rest to the lesson: a move is
    // asked for there, so it lands on the move and not back on the lesson.
    expect(at(learn, 'move=changes')).toBe(`${PAGE}?move=changes&session=next`);
    expect(at(learn, 'resume=n0nce&move=changes')).toBe(`${PAGE}?resume=n0nce&move=changes&session=next`);
    // The lesson asked for by name: view= is the address's own word, dropped on the way.
    expect(at(learn, 'view=lesson')).toBe('/learn/attempts/A_1');
    expect(at(learn, 'view=lesson&session=next')).toBe('/learn/attempts/A_1?session=next');
    // A Learn attempt's runs show on the pull request's page.
    const run = read({ attemptId: 'A_F2', kind: 'FOLLOW_UP', mode: undefined, followUpOf: { attemptId: 'A_1' } });
    expect(at(run, '', issue({ mode: 'LEARN' }))).toBe(`${PAGE}/runs/A_F2`);
  });

  it('never sends a Learn first attempt to the pull request without the next step, where the page would send it back', () => {
    const learn = read({ mode: 'LEARN' });
    for (const query of ['', 'resume=n0nce', 'session=next', 'move=changes', 'view=lesson', 'move=x&view=lesson']) {
      const target = at(learn, query) ?? '';
      if (target.startsWith('/my/pull-requests/')) expect(target, query).toMatch(/[?&]session=next(?:&|$)/);
    }
  });

  it('has no page for an attempt the issue read does not know, or a run without its first attempt', () => {
    expect(at(read(), '', null)).toBeNull();
    expect(at(read({ kind: 'FOLLOW_UP', followUpOf: null }))).toBeNull();
  });
});
