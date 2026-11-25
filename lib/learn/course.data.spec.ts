import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, cacheLife, cacheTag } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const {
  loadLearnCourse,
  loadLearnCourseDepths,
  loadLearnCourses,
  loadLearnCoursesMine,
  loadLearnLessons,
  loadLearnLessonsFixesListed,
  loadLearnLevel,
} = await import('./course.data');
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

  it("keeps which lessons have a listed fix for hours; throws when no lesson's is known, so nothing is kept", async () => {
    const listed = (fixesListed: boolean | null) => ({
      slug: 'sets',
      course: { slug: 'algorithms' },
      paused: false,
      fixesListed,
    });
    graphqlDirect.mockResolvedValueOnce({ learnLessons: [listed(true), listed(null)] });
    expect(await loadLearnLessonsFixesListed()).toEqual([listed(true), listed(null)]);
    expect(cacheTag).toHaveBeenLastCalledWith('learn:courses');
    expect(cacheLife).toHaveBeenLastCalledWith('hours');
    graphqlDirect.mockResolvedValueOnce({ learnLessons: [listed(false)] });
    expect(await loadLearnLessonsFixesListed()).toEqual([listed(false)]);
    expect(cacheLife).toHaveBeenLastCalledWith('hours');
    // The API could not read the fixes: every lesson's is null. Kept, it would leave every view out for hours.
    cacheLife.mockClear();
    graphqlDirect.mockResolvedValueOnce({ learnLessons: [listed(null), listed(null)] });
    await expect(loadLearnLessonsFixesListed()).rejects.toThrow();
    expect(cacheLife).not.toHaveBeenCalled();
    graphqlDirect.mockResolvedValueOnce({ learnLessons: [] });
    expect(await loadLearnLessonsFixesListed()).toEqual([]);
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');
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

  it("reads the person's courses in one read, and none on a failure", async () => {
    const mine = coursesMine.slice(0, 1);
    graphqlDirect.mockResolvedValueOnce({ learnCoursesMine: mine });
    expect(await loadLearnCoursesMine('octocat')).toEqual(mine);
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
    expect(graphqlDirect).toHaveBeenCalledWith(LearnCoursesMineDocument, {}, { source: 'ssr', githubLogin: 'octocat' });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadLearnCoursesMine('octocat')).toBeNull();
    graphqlDirect.mockResolvedValueOnce({ learnCoursesMine: null });
    expect(await loadLearnCoursesMine('octocat')).toBeNull();
    expect(cacheTag).not.toHaveBeenCalled();
  });

  it('reads the depth of each lesson in the courses asked, one read a course; none when one fails', async () => {
    graphqlDirect.mockImplementation(async (document, variables) => {
      if (document === LearnCourseMineDocument && variables.slug === 'algorithms')
        return { learnCourseMine: progressMine };
      throw new Error('down');
    });
    const depths = await loadLearnCourseDepths('octocat', ['algorithms']);
    expect(depths?.[progressMine.lessons[0].slug]).toBe(progressMine.lessons[0].depth);
    expect(Object.keys(depths ?? {})).toHaveLength(progressMine.lessons.length);
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
    expect(await loadLearnCourseDepths('octocat', ['algorithms', 'go'])).toBeNull();
  });
});
