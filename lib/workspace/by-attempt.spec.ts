import { describe, expect, it } from 'vitest';

import { type ByAttemptRead, byAttemptTargetOf } from './by-attempt';

const read = (over: Partial<ByAttemptRead> = {}): ByAttemptRead => ({
  attemptId: 'A_1',
  kind: 'FIRST',
  mode: 'FIX',
  followUpOf: null,
  ...over,
});
const at = (attempt: ByAttemptRead | null, query = '', id = 'A_1') =>
  byAttemptTargetOf(id, attempt, new URLSearchParams(query));

describe('the address by attempt, until the pull request has a page of its own', () => {
  it("sends a Fix attempt to Contribute's attempt page, the whole query kept", () => {
    expect(at(read())).toBe('/contribute/attempts/A_1');
    expect(at(read(), 'resume=n0nce&session=next&move=changes')).toBe(
      '/contribute/attempts/A_1?resume=n0nce&session=next&move=changes',
    );
  });

  it('sends a run to its session, under its first attempt', () => {
    const run = read({ attemptId: 'A_F2', kind: 'FOLLOW_UP', followUpOf: { attemptId: 'A_1' } });
    expect(at(run, 'move=reply-failed', 'A_F2')).toBe('/contribute/attempts/A_1/runs/A_F2?move=reply-failed');
  });

  it("sends a Learn attempt to its lesson, unless the link asks for the pull request's next step or a move", () => {
    const learn = read({ mode: 'LEARN' });
    expect(at(learn)).toBe('/learn/attempts/A_1');
    expect(at(learn, 'resume=n0nce')).toBe('/learn/attempts/A_1?resume=n0nce');
    expect(at(learn, 'session=next')).toBe('/contribute/attempts/A_1?session=next');
    // Contribute's page shows a Learn pull request's moves on its next step alone, and sends the rest to the lesson:
    // a move is asked for there, so it lands on the move and not back on the lesson.
    expect(at(learn, 'move=changes')).toBe('/contribute/attempts/A_1?move=changes&session=next');
    expect(at(learn, 'resume=n0nce&move=changes')).toBe(
      '/contribute/attempts/A_1?resume=n0nce&move=changes&session=next',
    );
    // The lesson asked for by name: view= is the address's own word, dropped on the way.
    expect(at(learn, 'view=lesson')).toBe('/learn/attempts/A_1');
    expect(at(learn, 'view=lesson&session=next')).toBe('/learn/attempts/A_1?session=next');
  });

  it("never sends a Learn first attempt to Contribute's page without the next step, where that page would send it back", () => {
    const learn = read({ mode: 'LEARN' });
    for (const query of ['', 'resume=n0nce', 'session=next', 'move=changes', 'view=lesson', 'move=x&view=lesson']) {
      const target = at(learn, query);
      if (target.startsWith('/contribute/attempts/')) expect(target, query).toMatch(/[?&]session=next(?:&|$)/);
    }
  });

  it("sends what it could not read to Contribute's attempt page, which signs in or answers the 404", () => {
    expect(at(null, 'session=next&view=lesson', 'A_9')).toBe('/contribute/attempts/A_9?session=next');
  });
});
