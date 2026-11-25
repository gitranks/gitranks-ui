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
    expect(graphqlDirect.mock.calls[0][2]).toMatchObject({ source: 'ssr', githubLogin: 'octocat' });
    graphqlDirect.mockRejectedValueOnce(unknownField());
    await expect(data.loadPullRequestPage(REF)).resolves.toBeUndefined();
    graphqlDirect.mockResolvedValueOnce({ pullRequestApproval: null });
    await expect(data.loadPullRequestApproval(REF)).resolves.toBeNull();
    graphqlDirect.mockRejectedValueOnce(unknownField());
    await expect(data.loadPullRequestList()).resolves.toBeUndefined();
    viewerLogin.mockResolvedValue(null);
    await expect(data.loadPullRequestPage(REF)).resolves.toBeUndefined();
  });

  it('gives each read a time limit, so a slow answer never holds the page', async () => {
    graphqlDirect.mockResolvedValue({});
    await data.loadPullRequestPage(REF);
    await data.loadPullRequestApproval(REF);
    await data.loadPullRequestList();
    await data.loadTimelineSwitch('A_1');
    expect(graphqlDirect).toHaveBeenCalledTimes(4);
    for (const [, , options] of graphqlDirect.mock.calls) expect(options.signal).toBeInstanceOf(AbortSignal);
    // Past the limit the read is aborted: the page says it did not load.
    graphqlDirect.mockRejectedValueOnce(new DOMException('The operation timed out.', 'TimeoutError'));
    await expect(data.loadPullRequestPage(REF)).resolves.toBeUndefined();
  });

  it("reads home's list with its newest merged one in one read, else the plain list with none", async () => {
    const row = {
      attemptId: 'A_1',
      repo: 'acme/widgets',
      issueNumber: 42,
      title: 'T',
      group: 'ENDED',
      box: 'MERGED',
      since: '2026-10-28T09:00:00.000Z',
    };
    graphqlDirect.mockResolvedValueOnce({
      pullRequestList: { rows: [row], open: 0, limit: 3, merged: { newest: row, newestPublicPage: true } },
    });
    const read = await data.loadPullRequestListWithMerged();
    expect(read?.rows).toHaveLength(1);
    expect(read?.merged).toMatchObject({ newest: { attemptId: 'A_1' }, newestPublicPage: true });
    expect(graphqlDirect.mock.calls[0][0]).toBe(documents.PullRequestListMergedDocument);
    expect(graphqlDirect.mock.calls[0][2].signal).toBeInstanceOf(AbortSignal);

    // An API that answers no `merged`: the list, and the box says it could not read.
    graphqlDirect.mockResolvedValueOnce({ pullRequestList: { rows: [row], open: 0, limit: 3 } });
    expect((await data.loadPullRequestListWithMerged())?.merged).toBeNull();

    // An API without the field: the plain list after.
    graphqlDirect.mockReset();
    graphqlDirect.mockRejectedValueOnce(unknownField());
    graphqlDirect.mockResolvedValueOnce({ pullRequestList: { rows: [row], open: 0, limit: 3 } });
    const plain = await data.loadPullRequestListWithMerged();
    expect(plain).toMatchObject({ merged: null });
    expect(plain?.rows).toHaveLength(1);
    expect(graphqlDirect.mock.calls[1][0]).toBe(documents.PullRequestListDocument);

    // Neither: not read.
    graphqlDirect.mockReset();
    graphqlDirect.mockRejectedValue(unknownField());
    await expect(data.loadPullRequestListWithMerged()).resolves.toBeUndefined();
    viewerLogin.mockResolvedValue(null);
    await expect(data.loadPullRequestListWithMerged()).resolves.toBeUndefined();
  });

  it('offers to hide or show the public page only when its approval carried the choice', async () => {
    const answer = (timeline: unknown) => graphqlDirect.mockResolvedValueOnce({ contributeAttempt: { timeline } });
    answer({ eligible: true, shown: true, hideable: true });
    await expect(data.loadTimelineSwitch('A_1')).resolves.toEqual({ shown: true });
    // Hidden by the person: shown again from the same line.
    answer({ eligible: true, shown: false, hideable: true });
    await expect(data.loadTimelineSwitch('A_1')).resolves.toEqual({ shown: false });
    answer({ eligible: true, shown: true, hideable: false });
    await expect(data.loadTimelineSwitch('A_1')).resolves.toBeNull();
    answer({ eligible: false, shown: null, hideable: true });
    await expect(data.loadTimelineSwitch('A_1')).resolves.toBeNull();
    graphqlDirect.mockRejectedValueOnce(unknownField());
    await expect(data.loadTimelineSwitch('A_1')).resolves.toBeNull();
  });
});

describe('the walkthroughs that wait for another pass', () => {
  const answerBy = (byDocument: Map<unknown, () => Promise<unknown>>) =>
    graphqlDirect.mockImplementation((document: unknown) => (byDocument.get(document) ?? (() => Promise.reject()))());

  it('reads them with their reasons in one operation of its own, with a time limit', async () => {
    answerBy(
      new Map<unknown, () => Promise<unknown>>([
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
    // One read of the "needs you" items, not two.
    expect(graphqlDirect).toHaveBeenCalledOnce();
    expect(graphqlDirect.mock.calls[0][2].signal).toBeInstanceOf(AbortSignal);
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
