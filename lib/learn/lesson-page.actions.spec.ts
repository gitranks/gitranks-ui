import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, viewerLogin } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), viewerLogin: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin }));

const { answerLearnLessonAction, sendLearnFeedbackAction } = await import('./lesson-page.actions');
const { AnswerLearnLessonDocument, AnswerLearnLessonInPlanDocument, SendLearnFeedbackDocument } = await import(
  './lesson-page.documents'
);

const answer = { slug: 'sets', question: 'q1', picked: [0, 2], tries: 2, language: 'python' };
const answered = {
  right: true,
  mine: {
    depth: 'LEARNED',
    known: false,
    learnedAt: '2026-11-23T10:00:00.000Z',
    dueAt: null,
    picked: [0, 2],
    tries: 2,
    feedbackGood: null,
  },
  next: { slug: 'maps', title: 'Maps' },
};
const apiError = (code: string) => new Error(JSON.stringify([{ message: 'no', extensions: { code } }]));

beforeEach(() => {
  graphqlDirect.mockReset();
  viewerLogin.mockReset();
  viewerLogin.mockResolvedValue('octocat');
});

describe("a lesson's answer", () => {
  it("sends the answer as the session's user and answers the API's verdict", async () => {
    graphqlDirect.mockResolvedValueOnce({ answerLearnLesson: answered });
    expect(await answerLearnLessonAction(answer)).toEqual({ ok: true, data: answered });
    expect(graphqlDirect).toHaveBeenCalledWith(AnswerLearnLessonDocument, answer, {
      source: 'client',
      githubLogin: 'octocat',
    });
  });

  it('answers no data when Learn is not open to the person', async () => {
    graphqlDirect.mockResolvedValueOnce({ answerLearnLesson: null });
    expect(await answerLearnLessonAction(answer)).toEqual({ ok: true, data: null });
  });

  it('refuses a bad answer without asking, and asks a signed-out person to sign in', async () => {
    for (const bad of [null, { ...answer, slug: '_gone' }, { ...answer, tries: 0 }, { ...answer, picked: {} }]) {
      expect(await answerLearnLessonAction(bad as never)).toMatchObject({ ok: false, error: 'INVALID' });
    }
    viewerLogin.mockResolvedValueOnce(undefined);
    expect(await answerLearnLessonAction(answer)).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('passes on what the API refuses', async () => {
    graphqlDirect.mockRejectedValueOnce(apiError('NOT_FOUND'));
    expect(await answerLearnLessonAction(answer)).toMatchObject({ ok: false, error: 'NOT_FOUND' });
  });

  it('sends the interview plan the lesson was opened from, and answers whether the lesson is held', async () => {
    const held = { ...answered, mine: { ...answered.mine, held: true } };
    graphqlDirect.mockResolvedValueOnce({ answerLearnLesson: held });
    const plan = 'northwind/senior-software-engineer';
    expect(await answerLearnLessonAction({ ...answer, plan })).toEqual({ ok: true, data: held });
    expect(graphqlDirect).toHaveBeenCalledWith(
      AnswerLearnLessonInPlanDocument,
      { ...answer, plan },
      { source: 'client', githubLogin: 'octocat' },
    );
  });

  it('sends the answer as before with no plan, and refuses a plan that is not two slugs', async () => {
    graphqlDirect.mockResolvedValueOnce({ answerLearnLesson: answered });
    await answerLearnLessonAction({ ...answer, plan: null });
    expect(graphqlDirect).toHaveBeenCalledWith(AnswerLearnLessonDocument, answer, expect.anything());
    graphqlDirect.mockReset();
    for (const plan of ['northwind', 'northwind/senior/more', 'Northwind/senior', `${'a'.repeat(200)}/b`, 7]) {
      expect(await answerLearnLessonAction({ ...answer, plan } as never)).toMatchObject({
        ok: false,
        error: 'INVALID',
      });
    }
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe("a lesson's rating", () => {
  it('sends the rating and its comment, trimmed, and says whether it was saved', async () => {
    graphqlDirect.mockResolvedValueOnce({ sendLearnFeedback: true });
    expect(await sendLearnFeedbackAction({ lesson: 'sets', good: false, comment: ' Too short. ' })).toEqual({
      ok: true,
      data: true,
    });
    expect(graphqlDirect).toHaveBeenCalledWith(
      SendLearnFeedbackDocument,
      { lesson: 'sets', good: false, comment: 'Too short.' },
      { source: 'client', githubLogin: 'octocat' },
    );
    graphqlDirect.mockResolvedValueOnce({ sendLearnFeedback: false });
    expect(await sendLearnFeedbackAction({ lesson: 'sets', good: true })).toEqual({ ok: true, data: false });
  });

  it('refuses a bad rating without asking, and asks a signed-out person to sign in', async () => {
    expect(await sendLearnFeedbackAction({ lesson: 'Sets', good: true })).toMatchObject({
      ok: false,
      error: 'INVALID',
    });
    viewerLogin.mockResolvedValueOnce(undefined);
    expect(await sendLearnFeedbackAction({ lesson: 'sets', good: true })).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('passes on a failure', async () => {
    graphqlDirect.mockRejectedValueOnce(apiError('FORBIDDEN'));
    expect(await sendLearnFeedbackAction({ lesson: 'sets', good: true })).toMatchObject({ ok: false });
  });
});
