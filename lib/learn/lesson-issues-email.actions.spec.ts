import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, viewerLogin } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), viewerLogin: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin }));

const { setLearnLessonIssuesEmailAction } = await import('./issues.actions');
const { loadLearnLessonIssuesEmail } = await import('./settings.data');
const { SetLearnLessonIssuesEmailDocument } = await import('./issues.documents');
const { LearnLessonIssuesEmailSettingsDocument } = await import('./settings.documents');

const LESSON = 'find-duplicates-with-a-set';
const apiError = (code: string) => new Error(JSON.stringify([{ message: 'no', extensions: { code } }]));

beforeEach(() => {
  graphqlDirect.mockReset();
  viewerLogin.mockReset().mockResolvedValue('octocat');
});

describe('the press of "Email me issues for my lessons"', () => {
  it("turns it on with the lesson as the session's user, and answers the switch", async () => {
    graphqlDirect.mockResolvedValueOnce({
      setLearnLessonIssuesEmail: { lessonIssues: true, lessonIssuesAsked: [LESSON] },
    });
    expect(await setLearnLessonIssuesEmailAction(true, LESSON)).toEqual({
      ok: true,
      data: { lessonIssues: true, lessonIssuesAsked: [LESSON] },
    });
    expect(graphqlDirect).toHaveBeenCalledWith(
      SetLearnLessonIssuesEmailDocument,
      { on: true, lesson: LESSON },
      { source: 'client', githubLogin: 'octocat' },
    );
  });

  it('turns the whole switch off and sends no lesson, nor one when Settings turns it on', async () => {
    graphqlDirect.mockResolvedValue({ setLearnLessonIssuesEmail: { lessonIssues: false, lessonIssuesAsked: [] } });
    await setLearnLessonIssuesEmailAction(false, LESSON);
    await setLearnLessonIssuesEmailAction(true, null);
    expect(graphqlDirect.mock.calls.map((call) => call[1])).toEqual([
      { on: false, lesson: null },
      { on: true, lesson: null },
    ]);
  });

  it('refuses what is not a switch or a lesson before asking the API, and a visitor', async () => {
    for (const [on, lesson] of [
      ['yes', LESSON],
      [true, '../lessons'],
      [true, 'A Lesson'],
      [true, 42],
    ] as const) {
      expect(await setLearnLessonIssuesEmailAction(on, lesson)).toEqual({ ok: false, error: 'INVALID' });
    }
    viewerLogin.mockResolvedValueOnce(null);
    expect(await setLearnLessonIssuesEmailAction(true, LESSON)).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('answers null data when Learn is not open, and why it failed otherwise', async () => {
    graphqlDirect.mockResolvedValueOnce({ setLearnLessonIssuesEmail: null });
    expect(await setLearnLessonIssuesEmailAction(true, LESSON)).toEqual({ ok: true, data: null });
    graphqlDirect.mockResolvedValueOnce({ setLearnLessonIssuesEmail: { lessonIssues: 'yes' } });
    expect(await setLearnLessonIssuesEmailAction(true, LESSON)).toEqual({ ok: false, error: 'FAILED' });
    // A slug that is no live lesson.
    graphqlDirect.mockRejectedValueOnce(apiError('BAD_USER_INPUT'));
    expect(await setLearnLessonIssuesEmailAction(true, LESSON)).toEqual({ ok: false, error: 'INVALID' });
    graphqlDirect.mockRejectedValueOnce(apiError('UNAUTHENTICATED'));
    expect(await setLearnLessonIssuesEmailAction(true, LESSON)).toEqual({ ok: false, error: 'SIGNED_OUT' });
  });
});

describe("Settings' read of the switch", () => {
  it('answers on or off, and none when the API leaves it null or fails', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnEmailSettings: { lessonIssues: true, lessonIssuesAsked: [LESSON] } });
    expect(await loadLearnLessonIssuesEmail('octocat')).toEqual({ on: true });
    expect(graphqlDirect).toHaveBeenCalledWith(
      LearnLessonIssuesEmailSettingsDocument,
      {},
      expect.objectContaining({ source: 'ssr', githubLogin: 'octocat' }),
    );
    graphqlDirect.mockResolvedValueOnce({ learnEmailSettings: { lessonIssues: null, lessonIssuesAsked: null } });
    expect(await loadLearnLessonIssuesEmail('octocat')).toBeNull();
    graphqlDirect.mockResolvedValueOnce({ learnEmailSettings: null });
    expect(await loadLearnLessonIssuesEmail('octocat')).toBeNull();
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadLearnLessonIssuesEmail('octocat')).toBeNull();
  });
});
