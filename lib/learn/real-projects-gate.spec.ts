import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { realProjectsGateOf, realProjectsMadeOf, realProjectsNotMadePathOf } = await import('./real-projects-gate');
const { RealProjectsFixesTotalDocument, RealProjectsOpenDocument } = await import('./real-projects.documents');

const lesson = { of: 'lesson', slug: 'sets-in-one-pass', markdown: false } as const;
const course = { of: 'course', slug: 'algorithms', markdown: false } as const;

/** The two reads' answers: the fixes' total, and how many open issues the shared list holds. */
function answer(fixes: number | null | Error, open: number | null | Error) {
  graphqlDirect.mockImplementation(async (document: unknown) => {
    const value = document === RealProjectsFixesTotalDocument ? fixes : open;
    if (value instanceof Error) throw value;
    if (document === RealProjectsFixesTotalDocument) return { learnFixes: value === null ? null : { total: value } };
    return {
      learnQueuePublic:
        value === null ? null : { rows: Array.from({ length: value }, (_, index) => ({ issue: { id: `i${index}` } })) },
    };
  });
}

describe('whether a view in real projects is made', () => {
  it('is not made only when both reads answered, with no fix and no open issue', () => {
    expect(realProjectsMadeOf({ fixes: 0, open: 0 })).toBe(false);
    expect(realProjectsMadeOf({ fixes: 1, open: 0 })).toBe(true);
    expect(realProjectsMadeOf({ fixes: 0, open: 1 })).toBe(true);
    // A read that could not be made never takes the page away.
    expect(realProjectsMadeOf({ fixes: null, open: 0 })).toBe(true);
    expect(realProjectsMadeOf({ fixes: 0, open: null })).toBe(true);
  });

  it("sends a view that is not made to the lesson's or the course's page, its copy to theirs", () => {
    expect(realProjectsNotMadePathOf(lesson)).toBe('/learn/lessons/sets-in-one-pass');
    expect(realProjectsNotMadePathOf({ ...lesson, markdown: true })).toBe('/learn/lessons/sets-in-one-pass.md');
    expect(realProjectsNotMadePathOf(course)).toBe('/learn/courses/algorithms');
    expect(realProjectsNotMadePathOf({ ...course, markdown: true })).toBe('/learn/courses/algorithms.md');
  });
});

describe('realProjectsGateOf', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
  });

  it('asks both, with no session, narrowed to the lesson or the course', async () => {
    answer(0, 0);
    expect(await realProjectsGateOf(lesson)).toBe('/learn/lessons/sets-in-one-pass');
    expect(graphqlDirect).toHaveBeenCalledWith(
      RealProjectsFixesTotalDocument,
      { input: { lesson: 'sets-in-one-pass', course: null } },
      expect.objectContaining({ source: 'ssr' }),
    );
    expect(graphqlDirect).toHaveBeenCalledWith(
      RealProjectsOpenDocument,
      { input: { lesson: 'sets-in-one-pass', course: null } },
      expect.objectContaining({ source: 'ssr' }),
    );
    graphqlDirect.mockClear();
    expect(await realProjectsGateOf({ ...course, markdown: true })).toBe('/learn/courses/algorithms.md');
    expect(graphqlDirect.mock.calls.map(([, variables]) => variables)).toEqual([
      { input: { lesson: null, course: 'algorithms' } },
      { input: { lesson: null, course: 'algorithms' } },
    ]);
  });

  it('lets the page answer with one fix, or one open issue', async () => {
    answer(1, 0);
    expect(await realProjectsGateOf(lesson)).toBeNull();
    answer(0, 1);
    expect(await realProjectsGateOf(lesson)).toBeNull();
  });

  it('lets the page answer when a read fails, answers none, or answers something it cannot count', async () => {
    for (const [fixes, open] of [
      [new Error('down'), 0],
      [0, new Error('down')],
      [null, 0],
      [0, null],
      [-1, 0],
      [Number.NaN, 0],
    ] as const) {
      answer(fixes, open);
      expect(await realProjectsGateOf(lesson), `${fixes} ${open}`).toBeNull();
    }
  });

  it('waits no longer than the limit, then lets the page answer and stops the reads', async () => {
    vi.useFakeTimers();
    try {
      const signals: AbortSignal[] = [];
      graphqlDirect.mockImplementation(
        (_document: unknown, _variables: unknown, { signal }: { signal: AbortSignal }) => {
          signals.push(signal);
          return new Promise(() => {});
        },
      );
      let settled = false;
      const gate = realProjectsGateOf(lesson, 2000).finally(() => {
        settled = true;
      });
      await vi.advanceTimersByTimeAsync(1999);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(await gate).toBeNull();
      expect(signals).toHaveLength(2);
      expect(signals.every((signal) => signal.aborted)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
