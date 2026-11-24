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
    expect(at(read(), 'session=next&move=changes')).toBe(`${PAGE}?session=next&move=changes`);
  });

  it("sends an older first attempt on the issue to its earlier page, and a run to its address under its first's", () => {
    expect(at(read({ attemptId: 'A_0' }), '', issue({ earlier: ['A_0'] }))).toBe(`${PAGE}/earlier/A_0`);
    const run = read({ attemptId: 'A_F2', kind: 'FOLLOW_UP', followUpOf: { attemptId: 'A_1' } });
    expect(at(run, 'move=reply-failed')).toBe(`${PAGE}/runs/A_F2?move=reply-failed`);
    const older = read({ attemptId: 'A_F1', kind: 'FOLLOW_UP', followUpOf: { attemptId: 'A_0' } });
    expect(at(older)).toBe(`${PAGE}/earlier/A_0/runs/A_F1`);
  });

  it('sends the way back from GitHub’s access screen to Approve, the resume kept', () => {
    expect(at(read(), 'resume=n0nce')).toBe(`${PAGE}/approve?resume=n0nce`);
    expect(at(read({ mode: 'LEARN' }), 'resume=n0nce')).toBe(`${PAGE}/approve?resume=n0nce`);
    // An earlier attempt has no Approve of its own: its page.
    expect(at(read({ attemptId: 'A_0' }), 'resume=n0nce', issue({ earlier: ['A_0'] }))).toBe(
      `${PAGE}/earlier/A_0?resume=n0nce`,
    );
  });

  it("leads a Learn fix's lesson, asked by name, to the fixer's walkthrough; anything else to the pull request", () => {
    const learn = read({ mode: 'LEARN' });
    // `view=` is the address's own word, dropped on the way.
    expect(at(learn, 'view=lesson')).toBe(`${PAGE}/walkthrough`);
    expect(at(learn, 'view=lesson&from=email')).toBe(`${PAGE}/walkthrough?from=email`);
    expect(at(learn)).toBe(PAGE);
    expect(at(learn, 'session=next')).toBe(`${PAGE}?session=next`);
    // A Fix attempt has no walkthrough: its page.
    expect(at(read(), 'view=lesson')).toBe(PAGE);
    // An earlier attempt's walkthrough is read from its page.
    expect(at(read({ attemptId: 'A_0', mode: 'LEARN' }), 'view=lesson', issue({ earlier: ['A_0'] }))).toBe(
      `${PAGE}/earlier/A_0`,
    );
    // A Learn attempt's runs show on the pull request's page.
    const run = read({ attemptId: 'A_F2', kind: 'FOLLOW_UP', mode: undefined, followUpOf: { attemptId: 'A_1' } });
    expect(at(run, 'view=lesson', issue({ mode: 'LEARN' }))).toBe(`${PAGE}/runs/A_F2`);
  });

  it('has no page for an attempt the issue read does not know, or a run without its first attempt', () => {
    expect(at(read(), '', null)).toBeNull();
    expect(at(read({ kind: 'FOLLOW_UP', followUpOf: null }))).toBeNull();
  });
});
