import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, cacheLife, cacheTag, highlightCodes } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  highlightCodes: vi.fn(async (codes: readonly { language: string; code: string }[]) =>
    codes.map((code) => ({ ...code, lines: [] })),
  ),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('./highlight', () => ({ highlightCodes }));

const { loadLearnAddress, loadLearnCourseGroups, loadLearnCourseMine, loadLearnLessonMine, loadLearnLessonPage } =
  await import('./lesson-page.data');
const { LearnCourseGroupsDocument, LearnLessonDocument } = await import('./lesson-page.documents');
const { setGroup, setLesson } = await import('./__fixtures__/lesson-page');

const apiError = (code: string) => new Error(JSON.stringify([{ message: 'no', extensions: { code } }]));
const groups = [
  { slug: 'other', name: 'Other', lessons: [] },
  { slug: setLesson.group.slug, name: setLesson.group.title, lessons: setGroup },
];

/** Answers each read by its document: the lesson, then its course's groups. */
function answer({
  lesson = setLesson as unknown,
  groupsRead = (async () => ({ learnCourse: { slug: 'c', groups } })) as () => Promise<unknown>,
} = {}) {
  graphqlDirect.mockImplementation(async (document) => {
    if (document === LearnLessonDocument) return { learnLesson: lesson };
    if (document === LearnCourseGroupsDocument) return groupsRead();
    throw new Error('unexpected read');
  });
}

beforeEach(() => {
  graphqlDirect.mockReset();
  cacheLife.mockReset();
  cacheTag.mockReset();
  highlightCodes.mockClear();
});

describe("a lesson's public layer", () => {
  it('reads the lesson with no session, highlights its code, finds its group, and keeps it for hours under both tags', async () => {
    answer();
    const page = await loadLearnLessonPage(setLesson.slug);
    expect(page?.lesson).toBe(setLesson);
    expect(page?.group).toEqual(setGroup);
    expect(page?.examples.map((example) => example.name)).toEqual(setLesson.examples.map((example) => example.name));
    expect(highlightCodes).toHaveBeenCalledWith(setLesson.question.codes);
    expect(graphqlDirect).toHaveBeenCalledWith(LearnLessonDocument, { slug: setLesson.slug }, { source: 'ssr' });
    expect(cacheTag.mock.calls.flat()).toEqual(
      expect.arrayContaining([`learn:lesson:${setLesson.slug}`, `learn:course:${setLesson.course.slug}`]),
    );
    expect(cacheLife.mock.calls.flat().filter((life) => life !== 'hours')).toEqual([]);
  });

  it("names a quote's project from its course, and leaves an example of ours as it is", async () => {
    const source = { repo: 'django/django', path: 'a.py', commit: 'abc', firstLine: 1, lastLine: 2, at: '2026-11-12' };
    const quoted = {
      ...setLesson,
      examples: [...setLesson.examples, { name: 'quote', codes: setLesson.examples[0].codes, source }],
    };
    answer({
      lesson: quoted,
      groupsRead: async () => ({ learnCourse: { slug: 'c', groups, project: { name: 'Django' } } }),
    });
    const page = await loadLearnLessonPage(setLesson.slug);
    expect(page?.examples.at(-1)).toMatchObject({ name: 'quote', source, project: 'Django' });
    expect(page?.examples[0]).toMatchObject({ source: null });
    expect(page?.examples[0]).not.toHaveProperty('project');
    expect(page?.group).toEqual(setGroup);

    // Its course could not be read: the quote names its repository.
    answer({
      lesson: quoted,
      groupsRead: async () => {
        throw new Error('down');
      },
    });
    expect((await loadLearnLessonPage(setLesson.slug))?.examples.at(-1)).toMatchObject({ project: null });
  });

  it('keeps a page whose group could not be read only for minutes, with no squares', async () => {
    answer({
      groupsRead: async () => {
        throw new Error('down');
      },
    });
    const page = await loadLearnLessonPage(setLesson.slug);
    expect(page?.group).toEqual([]);
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');
  });

  it('answers null for a lesson that is not one of ours, kept for minutes; a slug of no shape asks nothing', async () => {
    answer({ lesson: null });
    expect(await loadLearnLessonPage('route-cache-miss-8f3k')).toBeNull();
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');
    for (const code of ['NOT_FOUND', 'BAD_USER_INPUT', 'GRAPHQL_VALIDATION_FAILED']) {
      graphqlDirect.mockRejectedValueOnce(apiError(code));
      expect(await loadLearnLessonPage('route-cache-miss-8f3k'), code).toBeNull();
    }
    graphqlDirect.mockClear();
    expect(await loadLearnLessonPage('_missing')).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("keeps a course's groups for hours, and a course with none for minutes", async () => {
    graphqlDirect.mockResolvedValueOnce({ learnCourse: { slug: 'algorithms', groups } });
    expect(await loadLearnCourseGroups('algorithms')).toEqual(groups);
    expect(cacheLife.mock.calls).toEqual([['hours']]);
    expect(cacheTag).toHaveBeenCalledWith('learn:course:algorithms');
    for (const learnCourse of [null, { slug: 'algorithms', groups: [] }]) {
      cacheLife.mockReset();
      graphqlDirect.mockResolvedValueOnce({ learnCourse });
      expect(await loadLearnCourseGroups('algorithms'), JSON.stringify(learnCourse)).toBeNull();
      expect(cacheLife.mock.calls).toEqual([['minutes']]);
    }
  });

  it('throws any other failure, so nothing is kept', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    await expect(loadLearnLessonPage(setLesson.slug)).rejects.toThrow('down');
  });

  it("reads an address under the lesson's or the course's tag", async () => {
    const address = { state: 'PAUSED', movedTo: null, title: 'Sets', course: null };
    graphqlDirect.mockResolvedValue({ learnAddress: address });
    expect(await loadLearnAddress('lesson', 'sets')).toEqual(address);
    expect(cacheTag).toHaveBeenLastCalledWith('learn:lesson:sets');
    expect(await loadLearnAddress('course', 'algorithms')).toEqual(address);
    expect(cacheTag).toHaveBeenLastCalledWith('learn:course:algorithms');
    // A project course's address, by its project, under the list's tag.
    expect(await loadLearnAddress('repository', 'django/django')).toEqual(address);
    expect(cacheTag).toHaveBeenLastCalledWith('learn:courses');
    graphqlDirect.mockClear();
    expect(await loadLearnAddress('org', '_gone')).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe("a lesson's personal layer", () => {
  it('reads it as the person, with the language of the last answer, never kept', async () => {
    const read = {
      depth: 'LEARNED',
      known: false,
      learnedAt: null,
      dueAt: null,
      picked: 1,
      language: 'go',
      tries: 1,
      feedbackGood: null,
    };
    graphqlDirect.mockResolvedValueOnce({ learnLessonMine: read });
    expect(await loadLearnLessonMine('sets', 'octocat')).toEqual(read);
    expect(graphqlDirect.mock.calls[0][0].loc?.source.body).toContain(' language ');
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });
    expect(cacheLife).not.toHaveBeenCalled();
    expect(cacheTag).not.toHaveBeenCalled();
  });

  it('answers null on a failure, for nobody, and for a slug of no shape', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadLearnLessonMine('sets', 'octocat')).toBeNull();
    graphqlDirect.mockResolvedValueOnce({ learnLessonMine: null });
    expect(await loadLearnLessonMine('sets', 'octocat')).toBeNull();
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadLearnCourseMine('algorithms', 'octocat')).toBeNull();
    graphqlDirect.mockClear();
    expect(await loadLearnCourseMine('_x', 'octocat')).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});
