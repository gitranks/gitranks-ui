import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { loadLearnMyProgress, myProgressFaultOf, readFaultOf } = await import('./my-progress.data');
const { myProgress } = await import('./__fixtures__/my-progress');

const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
const logged = () => warn.mock.calls.map(([line]) => String(line));

beforeEach(() => {
  graphqlDirect.mockReset();
  warn.mockClear();
});

afterAll(() => {
  warn.mockRestore();
});

describe('My progress read', () => {
  it('gives an answer it can draw, and logs nothing', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnMyProgress: myProgress });
    expect(await loadLearnMyProgress('octocat')).toEqual(myProgress);
    expect(warn).not.toHaveBeenCalled();
  });

  it("logs a failed read by the API's paths and codes, never a server message", async () => {
    const errors = [
      {
        message: 'Cannot return null for non-nullable field LearnDay.lessons.',
        path: ['learnMyProgress', 'days', 0, 'lessons'],
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      },
      { message: 'Cast to string failed for value "octocat"', path: ['learnMyProgress'] },
    ];
    graphqlDirect.mockRejectedValueOnce(new Error(JSON.stringify(errors)));
    expect(await loadLearnMyProgress('octocat')).toBeNull();
    expect(logged()).toEqual([
      'My progress read failed: learnMyProgress.days.0.lessons [INTERNAL_SERVER_ERROR]; learnMyProgress [NO_CODE]',
    ]);
    expect(logged().join()).not.toContain('octocat');
  });

  it('keeps the message of a query the API refused, cut short', async () => {
    const message = `Cannot query field "nope" on type "LearnMyProgress". ${'x'.repeat(200)}`;
    graphqlDirect.mockRejectedValueOnce(
      new Error(JSON.stringify([{ message, extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } }])),
    );
    await loadLearnMyProgress('octocat');
    expect(logged()).toEqual([
      `My progress read failed: (no path) [GRAPHQL_VALIDATION_FAILED]: ${message.slice(0, 120)}`,
    ]);
  });

  it('names three errors of a long list, then how many more, in one short line', async () => {
    const errors = Array.from({ length: 182 }, (_, day) => ({
      message: 'Cannot return null for non-nullable field LearnDay.lessons.',
      path: ['learnMyProgress', 'days', day, 'lessons'],
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    }));
    graphqlDirect.mockRejectedValueOnce(new Error(JSON.stringify(errors)));
    await loadLearnMyProgress('octocat');
    const [line] = logged();
    expect(line).toBe(
      'My progress read failed: learnMyProgress.days.0.lessons [INTERNAL_SERVER_ERROR]; ' +
        'learnMyProgress.days.1.lessons [INTERNAL_SERVER_ERROR]; ' +
        'learnMyProgress.days.2.lessons [INTERNAL_SERVER_ERROR] (+179 more)',
    );
    expect(
      readFaultOf(new Error(JSON.stringify(errors.map((each) => ({ ...each, path: ['p'.repeat(400)] }))))),
    ).toHaveLength(300);
  });

  it('logs a failure that is not the API’s errors by its message', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('GraphQL error! 502: Bad Gateway'));
    expect(await loadLearnMyProgress('octocat')).toBeNull();
    expect(logged()).toEqual(['My progress read failed: GraphQL error! 502: Bad Gateway']);
  });

  it('logs an answer it cannot draw with the check that failed', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnMyProgress: { ...myProgress, activeDays: null } });
    expect(await loadLearnMyProgress('octocat')).toBeNull();
    graphqlDirect.mockResolvedValueOnce({ learnMyProgress: null });
    expect(await loadLearnMyProgress('octocat')).toBeNull();
    expect(logged()).toEqual(['My progress not drawn: activeDays is not a number', 'My progress not drawn: no answer']);
  });
});

describe('why an answer cannot be drawn', () => {
  it('names the first check that fails', () => {
    expect(myProgressFaultOf(myProgress)).toBeNull();
    expect(myProgressFaultOf(undefined)).toBe('no answer');
    expect(myProgressFaultOf({ ...myProgress, learned: Number.NaN })).toBe('learned is not a number');
    expect(myProgressFaultOf({ ...myProgress, days: null as never })).toBe('days is not a list');
    expect(myProgressFaultOf({ ...myProgress, courses: {} as never })).toBe('courses is not a list');
  });
});
