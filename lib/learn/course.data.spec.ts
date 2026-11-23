import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, cacheLife, cacheTag } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { loadLearnCourse, loadLearnCourses, loadLearnCoursesMine, loadLearnLessons, loadLearnLevel } = await import(
  './course.data'
);
const { LearnCourseDocument, LearnCoursesMineDocument, LearnSetupLevelDocument } = await import('./course.documents');
const { LearnCourseMineDocument } = await import('./lesson-page.documents');
const { algorithmsCourse, courseCards, coursesMine, lessonList, progressMine } = await import('./__fixtures__/course');

const apiError = (code: string) => new Error(JSON.stringify([{ message: 'no', extensions: { code } }]));

beforeEach(() => {
  graphqlDirect.mockReset();
  cacheLife.mockClear();
  cacheTag.mockClear();
});

describe('the public reads, cached for everyone', () => {
  it('keeps the courses and the lessons for hours under the list’s tag, and an empty list for minutes', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnCourses: courseCards });
    expect(await loadLearnCourses()).toEqual(courseCards);
    expect(cacheTag).toHaveBeenLastCalledWith('learn:courses');
    expect(cacheLife).toHaveBeenLastCalledWith('hours');
    graphqlDirect.mockResolvedValueOnce({ learnLessons: lessonList });
    expect(await loadLearnLessons()).toEqual(lessonList);
    expect(cacheTag).toHaveBeenLastCalledWith('learn:courses');
    graphqlDirect.mockResolvedValueOnce({ learnCourses: [] });
    expect(await loadLearnCourses()).toEqual([]);
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');
    // Read with no session: the same for everyone.
    for (const call of graphqlDirect.mock.calls) expect(call[2]).toEqual({ source: 'ssr' });
  });

  it('throws a failed read of the list, so nothing is kept', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    await expect(loadLearnCourses()).rejects.toThrow('down');
  });

  it('keeps a course for hours under its tag and the list’s; a course not there for minutes', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnCourse: algorithmsCourse });
    expect(await loadLearnCourse('algorithms')).toEqual(algorithmsCourse);
    expect(cacheTag).toHaveBeenCalledWith('learn:course:algorithms', 'learn:courses');
    expect(cacheLife).toHaveBeenLastCalledWith('hours');
    expect(graphqlDirect).toHaveBeenCalledWith(LearnCourseDocument, { slug: 'algorithms' }, { source: 'ssr' });
    for (const answer of [{ learnCourse: null }, apiError('NOT_FOUND'), apiError('GRAPHQL_VALIDATION_FAILED')]) {
      if (answer instanceof Error) graphqlDirect.mockRejectedValueOnce(answer);
      else graphqlDirect.mockResolvedValueOnce(answer);
      expect(await loadLearnCourse('algorithms')).toBeNull();
      expect(cacheLife).toHaveBeenLastCalledWith('minutes');
    }
  });

  it('asks nothing for a slug of another shape, and throws any other failure', async () => {
    expect(await loadLearnCourse('_gone')).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    await expect(loadLearnCourse('algorithms')).rejects.toThrow('down');
  });
});

describe("the person's reads, never kept", () => {
  it('reads the level as the person, and none on a failure', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnSetupOfMine: { level: 3 } });
    expect(await loadLearnLevel('octocat')).toBe(3);
    expect(graphqlDirect).toHaveBeenCalledWith(LearnSetupLevelDocument, {}, { source: 'ssr', githubLogin: 'octocat' });
    graphqlDirect.mockResolvedValueOnce({ learnSetupOfMine: null });
    expect(await loadLearnLevel('octocat')).toBeNull();
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadLearnLevel('octocat')).toBeNull();
    expect(cacheTag).not.toHaveBeenCalled();
  });

  it("reads the person's courses and each lesson's depth in them, only their own courses", async () => {
    const mine = coursesMine.slice(0, 1);
    graphqlDirect.mockImplementation(async (document, variables) => {
      if (document === LearnCoursesMineDocument) return { learnCoursesMine: mine };
      if (document === LearnCourseMineDocument && variables.slug === 'algorithms') {
        return { learnCourseMine: progressMine };
      }
      throw new Error('unexpected read');
    });
    const read = await loadLearnCoursesMine('octocat');
    expect(read?.courses).toEqual(mine);
    expect(read?.depths?.[progressMine.lessons[0].slug]).toBe(progressMine.lessons[0].depth);
    expect(Object.keys(read?.depths ?? {})).toHaveLength(progressMine.lessons.length);
  });

  it('keeps the courses and leaves the depths out when a course of theirs fails; none when the list fails', async () => {
    graphqlDirect.mockImplementation(async (document) => {
      if (document === LearnCoursesMineDocument) return { learnCoursesMine: coursesMine.slice(0, 1) };
      throw new Error('down');
    });
    expect(await loadLearnCoursesMine('octocat')).toEqual({ courses: coursesMine.slice(0, 1), depths: null });
    graphqlDirect.mockReset();
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadLearnCoursesMine('octocat')).toBeNull();
    graphqlDirect.mockResolvedValueOnce({ learnCoursesMine: null });
    expect(await loadLearnCoursesMine('octocat')).toBeNull();
  });
});
