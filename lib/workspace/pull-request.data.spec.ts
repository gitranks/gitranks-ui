import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, viewerLogin } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), viewerLogin: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('./contribute.data', () => ({ viewerLogin }));

const data = await import('./pull-request.data');
const documents = await import('./pull-request.documents');

const REF = data.pullRequestRefOf('acme/widgets', 42, 'A_1');
const unknownField = () => new Error(JSON.stringify([{ message: 'Cannot query field "since" on type "X".' }]));

beforeEach(() => {
  graphqlDirect.mockReset();
  viewerLogin.mockReset();
  viewerLogin.mockResolvedValue('octocat');
});

describe("the pull request's reads", () => {
  it('names the fix as the API takes it', () => {
    expect(REF).toEqual({ owner: 'acme', repo: 'widgets', issue: 42, attempt: 'A_1' });
  });

  it('asks as the session user; null when the fix is not theirs, nothing read when the API fails', async () => {
    graphqlDirect.mockResolvedValueOnce({ pullRequestPage: null });
    await expect(data.loadPullRequestPage(REF)).resolves.toBeNull();
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });
    graphqlDirect.mockRejectedValueOnce(unknownField());
    await expect(data.loadPullRequestPage(REF)).resolves.toBeUndefined();
    graphqlDirect.mockResolvedValueOnce({ pullRequestApproval: null });
    await expect(data.loadPullRequestApproval(REF)).resolves.toBeNull();
    graphqlDirect.mockRejectedValueOnce(unknownField());
    await expect(data.loadPullRequestList()).resolves.toBeUndefined();
    viewerLogin.mockResolvedValue(null);
    await expect(data.loadPullRequestPage(REF)).resolves.toBeUndefined();
  });

  it('offers to hide the public page only when its approval carried the choice and the page is shown', async () => {
    graphqlDirect.mockResolvedValueOnce({
      contributeAttempt: { timeline: { eligible: true, shown: true, hideable: true } },
    });
    await expect(data.loadTimelineHideable('A_1')).resolves.toBe(true);
    graphqlDirect.mockResolvedValueOnce({
      contributeAttempt: { timeline: { eligible: true, shown: true, hideable: false } },
    });
    await expect(data.loadTimelineHideable('A_1')).resolves.toBe(false);
    graphqlDirect.mockRejectedValueOnce(unknownField());
    await expect(data.loadTimelineHideable('A_1')).resolves.toBe(false);
  });
});

describe('the walkthroughs that wait for another pass', () => {
  const answerBy = (byDocument: Map<unknown, () => Promise<unknown>>) =>
    graphqlDirect.mockImplementation((document: unknown) => (byDocument.get(document) ?? (() => Promise.reject()))());

  it('reads the kinds and the reasons in two operations of their own, each with a time limit', async () => {
    answerBy(
      new Map<unknown, () => Promise<unknown>>([
        [
          documents.NeedsYouKindsDocument,
          async () => ({ contributeNeedsYou: { items: [{ kind: 'LESSON_BLOCKED', attemptId: 'A_1' }] } }),
        ],
        [
          documents.BlockedWalkthroughReasonsDocument,
          async () => ({
            contributeNeedsYou: {
              items: [{ kind: 'LESSON_BLOCKED', attemptId: 'A_1', facts: { blockedReason: 'unclear' } }],
            },
          }),
        ],
      ]),
    );
    const blocked = await data.loadBlockedWalkthroughs();
    expect(blocked?.get('A_1')).toEqual({ reason: 'A question is unclear.' });
    for (const [, , options] of graphqlDirect.mock.calls) expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it('keeps the title and the button when only the reason fails, and nothing when the kinds fail', async () => {
    answerBy(
      new Map<unknown, () => Promise<unknown>>([
        [
          documents.NeedsYouKindsDocument,
          async () => ({ contributeNeedsYou: { items: [{ kind: 'LESSON_BLOCKED', attemptId: 'A_1' }] } }),
        ],
        [documents.BlockedWalkthroughReasonsDocument, () => Promise.reject(unknownField())],
      ]),
    );
    expect((await data.loadBlockedWalkthroughs())?.get('A_1')).toEqual({ reason: null });
    answerBy(new Map());
    await expect(data.loadBlockedWalkthroughs()).resolves.toBeNull();
  });
});
