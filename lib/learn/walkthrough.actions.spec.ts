import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, viewerLogin, revalidateTag, switches } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  viewerLogin: vi.fn(),
  revalidateTag: vi.fn(),
  switches: { share: false },
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidateTag }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin }));
vi.mock('@/lib/learn/built-pages', () => ({
  get LEARN_ANSWERS_SHARE_SWITCH_ON() {
    return switches.share;
  },
}));

const { finishWalkthroughAction, shareAnswersAction } = await import('./walkthrough.actions');
const { PassLearnWalkthroughDocument, ShareLearnWalkthroughAnswersDocument } = await import('./walkthrough.documents');

const PR = { nameWithOwner: 'acme/widgets', number: 57 };
const ref = { owner: 'acme', repo: 'widgets', number: 57 };

beforeEach(() => {
  graphqlDirect.mockReset();
  revalidateTag.mockReset();
  viewerLogin.mockReset();
  viewerLogin.mockResolvedValue('octocat');
  switches.share = false;
});

describe('shareAnswersAction', () => {
  it('is refused by the server while the switch is off, without asking the API', async () => {
    expect(await shareAnswersAction(PR, false)).toEqual({ ok: false, error: 'NOT_AVAILABLE_YET' });
    expect(viewerLogin).not.toHaveBeenCalled();
    expect(graphqlDirect).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("once on, shares as the session's user and expires the fix's pages", async () => {
    switches.share = true;
    graphqlDirect.mockResolvedValue({
      shareLearnWalkthroughAnswers: { login: 'octocat', shared: true, passedAt: null, walkthrough: null, answers: [] },
    });
    const result = await shareAnswersAction(PR, true);
    expect(result).toMatchObject({ ok: true, data: { login: 'octocat', shared: true } });
    expect(graphqlDirect).toHaveBeenCalledWith(
      ShareLearnWalkthroughAnswersDocument,
      { ref, shared: true },
      { source: 'client', githubLogin: 'octocat' },
    );
    expect(revalidateTag).toHaveBeenCalledWith('learn:fix:acme/widgets#57', { expire: 0 });
  });

  it('refuses a pull request of no shape, and a signed-out call', async () => {
    switches.share = true;
    expect(await shareAnswersAction({ nameWithOwner: 'acme', number: 1 }, true)).toMatchObject({ error: 'INVALID' });
    viewerLogin.mockResolvedValue(null);
    expect(await shareAnswersAction(PR, true)).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe('finishWalkthroughAction', () => {
  it("stores the pass and leads to the first similar issue of the person's list", async () => {
    graphqlDirect.mockImplementation(async (document: unknown) =>
      document === PassLearnWalkthroughDocument
        ? { passLearnWalkthrough: true }
        : { learnFixMine: { fixer: false, passedAt: null, similar: [{ issue: { issue: { id: 'm1' } } }] } },
    );
    const { next } = await finishWalkthroughAction(PR, 3);
    expect(next).toContain('m1');
    expect(graphqlDirect).toHaveBeenCalledWith(
      PassLearnWalkthroughDocument,
      { ref, version: 3 },
      { source: 'client', githubLogin: 'octocat' },
    );
  });

  it('stores nothing signed out or for a version of no shape, and leads nowhere on a failure', async () => {
    expect(await finishWalkthroughAction(PR, 0)).toEqual({ next: null });
    viewerLogin.mockResolvedValue(null);
    expect(await finishWalkthroughAction(PR, 3)).toEqual({ next: null });
    expect(graphqlDirect).not.toHaveBeenCalled();
    viewerLogin.mockResolvedValue('octocat');
    graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await finishWalkthroughAction(PR, 3)).toEqual({ next: null });
  });
});
