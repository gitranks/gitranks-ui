import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, viewerLogin } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), viewerLogin: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin }));

const { answerLearnReviewAction } = await import('./review.actions');
const { AnswerLearnReviewDocument } = await import('./review.documents');
const { reviewReply } = await import('./__fixtures__/review');

const pick = { item: 'r1', picked: 0, forgot: false, language: 'python' };
const forgot = { item: 'r1', picked: null, forgot: true, language: null };
const apiError = (code: string) => new Error(JSON.stringify([{ message: 'no', extensions: { code } }]));

beforeEach(() => {
  graphqlDirect.mockReset();
  viewerLogin.mockReset().mockResolvedValue('octocat');
});

describe("a review's answer", () => {
  it("sends a pick as the session's user, and answers the API's verdict", async () => {
    const reply = reviewReply('PRACTISED');
    graphqlDirect.mockResolvedValueOnce({ answerLearnReview: reply });
    expect(await answerLearnReviewAction(pick)).toEqual({ ok: true, data: reply });
    expect(graphqlDirect).toHaveBeenCalledWith(
      AnswerLearnReviewDocument,
      { item: 'r1', picked: 0, language: 'python' },
      { source: 'client', githubLogin: 'octocat' },
    );
  });

  it('sends "I don\'t remember" with no pick', async () => {
    graphqlDirect.mockResolvedValueOnce({ answerLearnReview: reviewReply('BACK_TOMORROW') });
    await answerLearnReviewAction(forgot);
    expect(graphqlDirect.mock.calls[0][1]).toEqual({ item: 'r1', forgot: true, language: null });
  });

  it('answers no data when Learn is not open to the person', async () => {
    graphqlDirect.mockResolvedValueOnce({ answerLearnReview: null });
    expect(await answerLearnReviewAction(pick)).toEqual({ ok: true, data: null });
  });

  it('refuses a bad answer without asking, and a signed-out person without asking', async () => {
    for (const bad of [null, { ...pick, item: '' }, { ...pick, picked: {} }, { ...forgot, picked: 1 }]) {
      expect(await answerLearnReviewAction(bad as never)).toEqual({ ok: false, error: 'INVALID' });
    }
    viewerLogin.mockResolvedValueOnce(undefined);
    expect(await answerLearnReviewAction(pick)).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('passes on an answer refused as given already or not due, and any other failure', async () => {
    graphqlDirect.mockRejectedValueOnce(apiError('CONFLICT'));
    expect(await answerLearnReviewAction(pick)).toEqual({ ok: false, error: 'CONFLICT' });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await answerLearnReviewAction(pick)).toEqual({ ok: false, error: 'FAILED' });
  });
});
