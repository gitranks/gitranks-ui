import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, cacheLife, cacheTag } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { loadLearnProjectCourse, loadLearnProjectOpenIssues } = await import('./course.data');
const { LearnProjectCourseDocument, LearnProjectOpenIssuesDocument } = await import('./course.documents');
const { djangoCourse } = await import('./__fixtures__/course');

const apiError = (code: string) => new Error(JSON.stringify([{ message: 'no', extensions: { code } }]));

beforeEach(() => {
  graphqlDirect.mockReset();
  cacheLife.mockClear();
  cacheTag.mockClear();
});

describe("a project course's reads", () => {
  it("keeps a project's course for hours under the list's tag and its own, and none for minutes", async () => {
    graphqlDirect.mockResolvedValueOnce({ learnProjectCourse: djangoCourse });
    expect(await loadLearnProjectCourse({ repo: 'django/django' })).toEqual(djangoCourse);
    expect(graphqlDirect).toHaveBeenCalledWith(
      LearnProjectCourseDocument,
      { repo: 'django/django' },
      { source: 'ssr' },
    );
    expect(cacheTag.mock.calls.flat()).toEqual(['learn:courses', 'learn:course:django']);
    expect(cacheLife).toHaveBeenLastCalledWith('hours');

    cacheTag.mockClear();
    graphqlDirect.mockResolvedValueOnce({ learnProjectCourse: null });
    expect(await loadLearnProjectCourse({ org: 'nobody' })).toBeNull();
    expect(cacheTag.mock.calls.flat()).toEqual(['learn:courses']);
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');

    graphqlDirect.mockRejectedValueOnce(apiError('NOT_FOUND'));
    expect(await loadLearnProjectCourse({ org: 'nobody' })).toBeNull();
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    await expect(loadLearnProjectCourse({ org: 'kubernetes' })).rejects.toThrow('down');
  });

  it('reads the open issues apart, for minutes, with no count for none or a failed read', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnProjectCourse: { openIssues: 9 } });
    expect(await loadLearnProjectOpenIssues({ repo: 'django/django' })).toBe(9);
    expect(graphqlDirect).toHaveBeenCalledWith(
      LearnProjectOpenIssuesDocument,
      { repo: 'django/django' },
      { source: 'ssr' },
    );
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');
    for (const answer of [{ learnProjectCourse: { openIssues: 0 } }, { learnProjectCourse: null }, {}]) {
      graphqlDirect.mockResolvedValueOnce(answer);
      expect(await loadLearnProjectOpenIssues({ org: 'kubernetes' }), JSON.stringify(answer)).toBeNull();
    }
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadLearnProjectOpenIssues({ org: 'kubernetes' })).toBeNull();
  });
});
