import { print } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const m = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  fixesCached: vi.fn(),
  loadMaskedListReads: vi.fn(),
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: m.graphqlDirect }));
vi.mock('./issues.data', () => ({ fixesCached: m.fixesCached }));
vi.mock('@/lib/workspace/masked-issue.data', () => ({ loadMaskedListReads: m.loadMaskedListReads }));

const { loadCourseOpenIssues, loadHomeIssuesEmail, loadHomeReal, loadLessonRealMine, loadMergedFixes } = await import(
  './real-issues.data'
);
const { NO_HOME_REAL, NO_LESSON_REAL } = await import('./real-issues');
const { issueRows, learnFixes } = await import('./__fixtures__/issues');
const { homeFixNeedsYou, myFixOpen } = await import('./__fixtures__/real-issues');

/** The API's answer to a field it does not know yet, as it throws it. */
const unknownField = (field: string, type: string) =>
  new Error(
    JSON.stringify([
      {
        message: `Cannot query field "${field}" on type "${type}".`,
        extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
      },
    ]),
  );

/** The operation each call sent, by its name. */
const operationOf = (call: unknown[]) => print(call[0] as Parameters<typeof print>[0]).match(/query (\w+)/)?.[1];

const reads = { looks: null, numbers: { read: 2, kept: 0 } };

beforeEach(() => {
  for (const mock of Object.values(m)) mock.mockReset();
  m.fixesCached.mockResolvedValue(learnFixes);
  m.loadMaskedListReads.mockResolvedValue(reads);
});

describe('merged fixes', () => {
  it('are the cached read for a lesson, a course or all', async () => {
    expect(await loadMergedFixes({ lesson: 'a-hash-map' })).toBe(learnFixes);
    expect(m.fixesCached).toHaveBeenLastCalledWith('a-hash-map', null, null, null);
    await loadMergedFixes({ course: 'algorithms' });
    expect(m.fixesCached).toHaveBeenLastCalledWith(null, 'algorithms', null, null);
    await loadMergedFixes();
    expect(m.fixesCached).toHaveBeenLastCalledWith(null, null, null, null);
  });

  it('are none when they cannot be read, or for a slug that is not one', async () => {
    m.fixesCached.mockRejectedValueOnce(new Error('NOT_AVAILABLE_YET'));
    expect(await loadMergedFixes()).toBeNull();
    expect(await loadMergedFixes({ lesson: '../x' })).toBeNull();
  });
});

describe("a lesson's real side for the person", () => {
  const answer = (mine: unknown, list: unknown) =>
    m.graphqlDirect.mockImplementation(async (document: unknown) => {
      const name = operationOf([document]);
      const value = name === 'LessonReal' ? mine : list;
      if (value instanceof Error) throw value;
      return value;
    });

  it('reads their fix, their first issue and their rows apart from the lesson, as them', async () => {
    answer(
      { learnLessonMine: { fix: myFixOpen, fixAnIssue: issueRows[0] } },
      { learnQueue: { rows: issueRows.slice(0, 3) } },
    );
    expect(await loadLessonRealMine('a-hash-map', 'octocat')).toEqual({
      real: { fix: myFixOpen, fixAnIssue: issueRows[0] },
      rows: issueRows.slice(0, 3),
      reads,
      fixes: learnFixes,
    });
    const names = m.graphqlDirect.mock.calls.map(operationOf).sort();
    expect(names).toEqual(['LessonReal', 'RealIssuesList']);
    for (const [, , options] of m.graphqlDirect.mock.calls) {
      expect(options).toEqual({ source: 'ssr', githubLogin: 'octocat' });
    }
    const list = m.graphqlDirect.mock.calls.find((call) => operationOf(call) === 'RealIssuesList')!;
    expect(list[1]).toEqual({ lesson: 'a-hash-map', course: null });
    expect(print(list[0])).toContain('forYou: true');
  });

  it('is nothing when the API knows none of it, or fails, and then reads nothing more', async () => {
    answer(unknownField('fix', 'LearnLessonMine'), unknownField('lesson', 'LearnQueueInput'));
    expect(await loadLessonRealMine('a-hash-map', 'octocat')).toEqual(NO_LESSON_REAL);
    answer({ learnLessonMine: null }, { learnQueue: null });
    expect(await loadLessonRealMine('a-hash-map', 'octocat')).toEqual(NO_LESSON_REAL);
    expect(m.fixesCached).not.toHaveBeenCalled();
    expect(m.loadMaskedListReads).not.toHaveBeenCalled();
    expect(await loadLessonRealMine('../x', 'octocat')).toEqual(NO_LESSON_REAL);
  });

  it('keeps what one read gives when the other fails, reading no rows when there are none', async () => {
    answer({ learnLessonMine: { fix: myFixOpen, fixAnIssue: null } }, new Error('down'));
    expect(await loadLessonRealMine('a-hash-map', 'octocat')).toEqual({
      real: { fix: myFixOpen, fixAnIssue: null },
      rows: null,
      reads: null,
      fixes: learnFixes,
    });
    expect(m.loadMaskedListReads).not.toHaveBeenCalled();
    m.loadMaskedListReads.mockRejectedValue(new Error('down'));
    answer(new Error('down'), { learnQueue: { rows: issueRows } });
    expect((await loadLessonRealMine('a-hash-map', 'octocat')).reads).toBeNull();
  });
});

describe("Learn home's real issues", () => {
  it('reads the issues and the fixes apart, as the person', async () => {
    m.graphqlDirect.mockImplementation(async (document: unknown) =>
      operationOf([document]) === 'HomeIssues'
        ? { learnHome: { thirdBox: { openIssues: 4 }, issues: { rows: issueRows } } }
        : { learnHome: { thirdBox: { needsYou: true, fix: homeFixNeedsYou }, fixes: [homeFixNeedsYou] } },
    );
    expect(await loadHomeReal('octocat')).toEqual({
      box: { kind: 'fix', row: homeFixNeedsYou, state: 'needs-you', openIssues: 4 },
      fixes: [homeFixNeedsYou],
      issues: issueRows,
    });
    expect(m.graphqlDirect.mock.calls.map(operationOf).sort()).toEqual(['HomeFixes', 'HomeIssues']);
    // The list's email rides on the issues' read, for the quiet box.
    const issues = m.graphqlDirect.mock.calls.find((call) => operationOf(call) === 'HomeIssues')!;
    expect(print(issues[0])).toContain('emailOn');
  });

  it('is nothing when the API knows neither, and the issues alone when the fixes fail', async () => {
    m.graphqlDirect.mockRejectedValue(unknownField('thirdBox', 'LearnHome'));
    expect(await loadHomeReal('octocat')).toEqual(NO_HOME_REAL);
    m.graphqlDirect.mockImplementation(async (document: unknown) => {
      if (operationOf([document]) === 'HomeFixes') throw new Error('down');
      return { learnHome: { thirdBox: { openIssues: 2 }, issues: { rows: [] } } };
    });
    expect(await loadHomeReal('octocat')).toEqual({ box: { kind: 'issues', count: 2 }, fixes: [], issues: [] });
  });
});

describe("a course's open issues", () => {
  it('reads the count apart from the course, as the person', async () => {
    m.graphqlDirect.mockResolvedValue({ learnCourseMine: { openIssues: 3 } });
    expect(await loadCourseOpenIssues('algorithms', 'octocat')).toBe(3);
    const [document, variables, options] = m.graphqlDirect.mock.calls[0];
    expect(print(document)).toContain('openIssues');
    expect(variables).toEqual({ slug: 'algorithms' });
    expect(options).toEqual({ source: 'ssr', githubLogin: 'octocat' });
  });

  it('is none at zero, when unknown to the API, or on any failure', async () => {
    for (const answer of [{ learnCourseMine: { openIssues: 0 } }, { learnCourseMine: null }, {}]) {
      m.graphqlDirect.mockResolvedValueOnce(answer);
      expect(await loadCourseOpenIssues('algorithms', 'octocat'), JSON.stringify(answer)).toBeNull();
    }
    m.graphqlDirect.mockRejectedValueOnce(unknownField('openIssues', 'LearnCourseMine'));
    expect(await loadCourseOpenIssues('algorithms', 'octocat')).toBeNull();
    expect(await loadCourseOpenIssues('../x', 'octocat')).toBeNull();
  });
});

describe("Learn home's list email, read again", () => {
  it('is the email of the home issues read, as the person, and none on a failure or with none', async () => {
    m.graphqlDirect.mockResolvedValueOnce({ learnHome: { issues: { rows: [], emailOn: true, emailTo: 'a@b.c' } } });
    expect(await loadHomeIssuesEmail('octocat')).toEqual({ emailOn: true, emailTo: 'a@b.c' });
    expect(operationOf(m.graphqlDirect.mock.calls[0])).toBe('HomeIssues');
    expect(m.graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });
    m.graphqlDirect.mockResolvedValueOnce({ learnHome: { issues: { rows: [], emailOn: true, emailTo: '' } } });
    expect(await loadHomeIssuesEmail('octocat')).toEqual({ emailOn: true, emailTo: null });
    m.graphqlDirect.mockResolvedValueOnce({ learnHome: null });
    expect(await loadHomeIssuesEmail('octocat')).toBeNull();
    m.graphqlDirect.mockRejectedValueOnce(unknownField('emailOn', 'LearnQueue'));
    expect(await loadHomeIssuesEmail('octocat')).toBeNull();
  });
});
