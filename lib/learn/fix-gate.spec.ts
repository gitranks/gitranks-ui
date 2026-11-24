import { beforeEach, describe, expect, it, vi } from 'vitest';

const graphqlDirect = vi.hoisted(() => vi.fn());
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const {
  FIX_GATE_MEMO_MS,
  FIX_GATE_MEMO_SIZE,
  fixByAttemptGateOf,
  fixByAttemptRouteGateOf,
  fixGateOf,
  fixRouteGateOf,
  fixViewGateOf,
  fixViewRouteGateOf,
  forgetFixGates,
} = await import('./fix-gate');

const pr = { nameWithOwner: 'acme/widgets', number: 57 };
const walkthrough = { pr, login: null };
const answers = { pr, login: 'octocat' };
const live = { state: 'LIVE', owner: 'acme', repo: 'widgets', number: 57, login: 'octocat' } as const;

beforeEach(() => {
  graphqlDirect.mockReset();
  forgetFixGates();
});

describe('fixGateOf', () => {
  it('goes on to the page for a live address, private answers, and a read it cannot use', () => {
    expect(fixGateOf(walkthrough, live)).toEqual({ kind: 'page' });
    expect(fixGateOf(answers, { ...live, state: 'PRIVATE' })).toEqual({ kind: 'page' });
    expect(fixGateOf(walkthrough, null)).toEqual({ kind: 'page' });
    expect(fixGateOf(walkthrough, { ...live, owner: null })).toEqual({ kind: 'page' });
  });

  it('answers nothing there, and a removed fix with its own page', () => {
    expect(fixGateOf(walkthrough, { ...live, state: 'MISSING' })).toEqual({ kind: 'missing' });
    expect(fixGateOf(answers, { ...live, state: 'REMOVED' })).toEqual({
      kind: 'removed',
      path: '/learn/fixes/_removed/acme/widgets/57',
    });
  });

  it("moves another spelling to the API's: a renamed repository, a login's letter case", () => {
    expect(fixGateOf(walkthrough, { ...live, repo: 'gadgets' })).toEqual({
      kind: 'redirect',
      path: '/learn/fixes/acme/gadgets/57/walkthrough',
    });
    expect(fixGateOf(answers, { ...live, login: 'Octocat' })).toEqual({
      kind: 'redirect',
      path: '/learn/fixes/acme/widgets/57/walkthrough/by/Octocat',
    });
  });
});

describe('fixRouteGateOf', () => {
  it('asks the API with the pull request and the login, signed out', async () => {
    graphqlDirect.mockResolvedValue({ learnFixAddress: { ...live, state: 'MISSING' } });
    expect(await fixRouteGateOf(answers)).toEqual({ kind: 'missing' });
    expect(graphqlDirect.mock.calls[0][1]).toEqual({
      ref: { owner: 'acme', repo: 'widgets', number: 57 },
      login: 'octocat',
    });
    expect(graphqlDirect.mock.calls[0][2]).toMatchObject({ source: 'ssr' });
    expect(graphqlDirect.mock.calls[0][2].githubLogin).toBeUndefined();
  });

  it('leaves a failed or slow ask to the page', async () => {
    graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await fixRouteGateOf(walkthrough)).toEqual({ kind: 'page' });
    graphqlDirect.mockReturnValue(new Promise(() => {}));
    expect(await fixRouteGateOf(walkthrough, 5)).toEqual({ kind: 'page' });
  });

  it('gives up the request itself when the time runs out', async () => {
    graphqlDirect.mockReturnValue(new Promise(() => {}));
    await fixRouteGateOf(walkthrough, 5);
    const { signal } = graphqlDirect.mock.calls[0][2] as { signal: AbortSignal };
    expect(signal.aborted).toBe(true);
  });

  it('keeps a live answer for a minute, and asks again for any other', async () => {
    graphqlDirect.mockResolvedValue({ learnFixAddress: live });
    expect(await fixRouteGateOf(answers, 100, 0)).toEqual({ kind: 'page' });
    expect(await fixRouteGateOf(answers, 100, FIX_GATE_MEMO_MS - 1)).toEqual({ kind: 'page' });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
    await fixRouteGateOf(answers, 100, FIX_GATE_MEMO_MS);
    expect(graphqlDirect).toHaveBeenCalledTimes(2);

    graphqlDirect.mockResolvedValue({ learnFixAddress: { ...live, state: 'PRIVATE' } });
    await fixRouteGateOf(walkthrough, 100, 0);
    await fixRouteGateOf(walkthrough, 100, 0);
    expect(graphqlDirect).toHaveBeenCalledTimes(4);
  });

  it('keeps at most so many answers, the oldest going first', async () => {
    graphqlDirect.mockImplementation(async (_document: unknown, { ref }: { ref: { number: number } }) => ({
      learnFixAddress: { ...live, number: ref.number },
    }));
    const route = (number: number) => ({ pr: { ...pr, number }, login: null });
    for (let number = 1; number <= FIX_GATE_MEMO_SIZE + 1; number++) await fixRouteGateOf(route(number), 100, 0);
    graphqlDirect.mockClear();
    await fixRouteGateOf(route(FIX_GATE_MEMO_SIZE + 1), 100, 0);
    expect(graphqlDirect).not.toHaveBeenCalled();
    await fixRouteGateOf(route(1), 100, 0);
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
  });
});

describe('fixByAttemptGateOf', () => {
  it("leads to the fixer's answers page, or the walkthrough of a removed fix", () => {
    expect(fixByAttemptGateOf(live)).toEqual({
      kind: 'redirect',
      path: '/learn/fixes/acme/widgets/57/walkthrough/by/octocat',
    });
    expect(fixByAttemptGateOf({ ...live, state: 'PRIVATE' })).toEqual({
      kind: 'redirect',
      path: '/learn/fixes/acme/widgets/57/walkthrough/by/octocat',
    });
    expect(fixByAttemptGateOf({ ...live, state: 'REMOVED' })).toEqual({
      kind: 'redirect',
      path: '/learn/fixes/acme/widgets/57/walkthrough',
    });
  });

  it('answers nothing there for no pull request, and the pages for maintainers when the API cannot say', () => {
    expect(fixByAttemptGateOf({ ...live, state: 'MISSING' })).toEqual({ kind: 'missing' });
    expect(fixByAttemptGateOf({ ...live, number: null })).toEqual({ kind: 'missing' });
    expect(fixByAttemptGateOf(null)).toEqual({ kind: 'redirect', path: '/contribute/maintainers#learn' });
  });
});

describe('fixByAttemptRouteGateOf', () => {
  it('asks the API with the attempt, signed out, and keeps a live answer', async () => {
    graphqlDirect.mockResolvedValue({ learnFixAddress: live });
    expect(await fixByAttemptRouteGateOf('A_1', 100, 0)).toMatchObject({ kind: 'redirect' });
    await fixByAttemptRouteGateOf('A_1', 100, 0);
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
    expect(graphqlDirect.mock.calls[0][1]).toEqual({ attempt: 'A_1' });
  });

  it('sends a failed or slow ask to the pages for maintainers, never kept', async () => {
    graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await fixByAttemptRouteGateOf('A_1')).toEqual({ kind: 'redirect', path: '/contribute/maintainers#learn' });
    graphqlDirect.mockReturnValue(new Promise(() => {}));
    expect(await fixByAttemptRouteGateOf('A_1', 5)).toEqual({
      kind: 'redirect',
      path: '/contribute/maintainers#learn',
    });
    expect(graphqlDirect).toHaveBeenCalledTimes(2);
  });
});

describe('fixViewGateOf', () => {
  const fix = { repo: 'acme/widgets', number: 57, made: 'LEARN', state: 'MERGED' };

  it('goes on to "Learn from it" for a Learn fix at its own spelling, and leaves no answer to the page', () => {
    expect(fixViewGateOf(pr, { address: live, fix, shown: true })).toEqual({ kind: 'page' });
    expect(fixViewGateOf(pr, { address: live, fix: { ...fix, state: 'OPEN' }, shown: true })).toEqual({
      kind: 'page',
    });
    expect(fixViewGateOf(pr, null)).toEqual({ kind: 'page' });
  });

  it('answers nothing there for a Learn fix whose public page its fixer hid: the page could not draw it', () => {
    expect(fixViewGateOf(pr, { address: live, fix, shown: false })).toEqual({ kind: 'missing' });
    // Another spelling still moves first: the page at the API's spelling is asked again.
    expect(fixViewGateOf({ nameWithOwner: 'ACME/widgets', number: 57 }, { address: live, fix, shown: false })).toEqual({
      kind: 'redirect',
      path: '/learn/fixes/acme/widgets/57',
    });
  });

  it('sends a pull request with no such view to "How it was made"', () => {
    for (const other of [
      { ...fix, made: 'CONTRIBUTE' },
      { ...fix, state: 'CLOSED' },
    ]) {
      expect(fixViewGateOf(pr, { address: { ...live, state: 'MISSING' }, fix: other, shown: true })).toEqual({
        kind: 'redirect',
        path: '/contribute/pr/acme/widgets/57',
      });
    }
  });

  it('answers nothing there, a removed fix, and another spelling', () => {
    expect(fixViewGateOf(pr, { address: { ...live, state: 'MISSING' }, fix: null, shown: false })).toEqual({
      kind: 'missing',
    });
    expect(fixViewGateOf(pr, { address: { ...live, state: 'REMOVED' }, fix, shown: false })).toEqual({
      kind: 'removed',
      path: '/learn/fixes/_removed/acme/widgets/57',
    });
    expect(fixViewGateOf({ nameWithOwner: 'ACME/widgets', number: 57 }, { address: live, fix, shown: true })).toEqual({
      kind: 'redirect',
      path: '/learn/fixes/acme/widgets/57',
    });
  });
});

describe('fixViewRouteGateOf', () => {
  it('asks the address and the fix in one read, signed out, and keeps a live page a minute', async () => {
    graphqlDirect.mockResolvedValue({
      learnFixAddress: live,
      learnFix: { repo: 'acme/widgets', number: 57, made: 'LEARN', state: 'MERGED' },
      contributePrTimeline: { timeline: { number: 57 } },
    });
    expect(await fixViewRouteGateOf(pr, 2000, 0)).toEqual({ kind: 'page' });
    expect(graphqlDirect).toHaveBeenCalledWith(
      expect.anything(),
      { ref: { owner: 'acme', repo: 'widgets', number: 57 }, owner: 'acme', repo: 'widgets', number: 57 },
      expect.objectContaining({ source: 'ssr' }),
    );
    expect(await fixViewRouteGateOf(pr, 2000, FIX_GATE_MEMO_MS - 1)).toEqual({ kind: 'page' });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
  });

  it('answers nothing there for a hidden page, never kept', async () => {
    graphqlDirect.mockResolvedValue({
      learnFixAddress: live,
      learnFix: { repo: 'acme/widgets', number: 57, made: 'LEARN', state: 'MERGED' },
      contributePrTimeline: { timeline: null, movedTo: null },
    });
    expect(await fixViewRouteGateOf(pr, 2000, 0)).toEqual({ kind: 'missing' });
    expect(await fixViewRouteGateOf(pr, 2000, 1)).toEqual({ kind: 'missing' });
    expect(graphqlDirect).toHaveBeenCalledTimes(2);
  });

  it('leaves a failed ask (an API that does not know the read) to the page, never kept', async () => {
    graphqlDirect.mockRejectedValue(new Error('Cannot query field "learnFix"'));
    expect(await fixViewRouteGateOf(pr, 2000, 0)).toEqual({ kind: 'page' });
    expect(await fixViewRouteGateOf(pr, 2000, 1)).toEqual({ kind: 'page' });
    expect(graphqlDirect).toHaveBeenCalledTimes(2);
  });
});
