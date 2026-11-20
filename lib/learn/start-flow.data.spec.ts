import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { cacheLife, graphqlDirect } = vi.hoisted(() => ({ cacheLife: vi.fn(), graphqlDirect: vi.fn() }));
vi.mock('next/cache', () => ({ cacheLife }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
const reads = vi.hoisted(() => ({
  loadWorkspaceGate: vi.fn(),
  contributeOpen: vi.fn(async () => true),
  learnOpenToEveryone: vi.fn(async () => false),
  loadLearnProfile: vi.fn(),
}));
vi.mock('@/lib/workspace/gate.data', () => ({ loadWorkspaceGate: reads.loadWorkspaceGate }));
vi.mock('@/lib/workspace/preview-gate', () => ({ contributeOpen: reads.contributeOpen }));
vi.mock('./learn-everyone', () => ({ learnOpenToEveryone: reads.learnOpenToEveryone }));
vi.mock('./learn.data', () => ({ loadLearnProfile: reads.loadLearnProfile }));

const { loadLearnFlowPlace, readLearnPublicIssues, readLearnPublicPractice, LEARN_PUBLIC_PRACTICE_MAX } = await import(
  './start-flow.data'
);
const { filledProfile } = await import('./__fixtures__/profile');

const open = (entered: boolean, learnOpen = true) => ({
  kind: 'open',
  entered,
  agents: { hosted: false, own: entered },
  learnOpen,
});

beforeEach(() => vi.clearAllMocks());

describe("where a person belongs on Learn's flow", () => {
  it('asks a visitor only whether Learn is open to everyone; nothing of an account', async () => {
    reads.loadWorkspaceGate.mockResolvedValue({ kind: 'signed-out' });
    expect((await loadLearnFlowPlace('goal', { goalInAddress: false })).place).toEqual({ kind: 'not-found' });
    reads.learnOpenToEveryone.mockResolvedValueOnce(true);
    expect(await loadLearnFlowPlace('issues', { goalInAddress: true })).toMatchObject({
      place: { kind: 'page' },
      profile: null,
    });
    expect(reads.loadLearnProfile).not.toHaveBeenCalled();
    expect(reads.contributeOpen).not.toHaveBeenCalled();
  });

  it('reads the saved goal of an account Learn is open to, and decides by it', async () => {
    reads.loadWorkspaceGate.mockResolvedValue(open(false));
    reads.loadLearnProfile.mockResolvedValueOnce(null);
    expect((await loadLearnFlowPlace('issues', { goalInAddress: false })).place).toEqual({
      kind: 'redirect',
      to: '/learn/start',
    });
    reads.loadLearnProfile.mockResolvedValueOnce(filledProfile);
    expect(await loadLearnFlowPlace('issues', { goalInAddress: false })).toMatchObject({
      place: { kind: 'page' },
      profile: filledProfile,
    });
    expect(reads.learnOpenToEveryone).not.toHaveBeenCalled();
  });

  it('an entered account with a goal only in the address saves it before it moves on to the Learn tab', async () => {
    reads.loadWorkspaceGate.mockResolvedValue(open(true));
    reads.loadLearnProfile.mockResolvedValueOnce(null);
    expect((await loadLearnFlowPlace('issues', { goalInAddress: true })).place).toEqual({
      kind: 'apply-then',
      to: '/learn',
    });
  });

  it('an account Learn is not open to gets the 404, its goal unread; one with no profile asks about the launch', async () => {
    reads.loadWorkspaceGate.mockResolvedValue(open(false, false));
    expect((await loadLearnFlowPlace('goal', { goalInAddress: false })).place).toEqual({ kind: 'not-found' });
    expect(reads.loadLearnProfile).not.toHaveBeenCalled();
    reads.loadWorkspaceGate.mockResolvedValue({ kind: 'hidden' });
    expect((await loadLearnFlowPlace('goal', { goalInAddress: false })).place).toEqual({ kind: 'no-profile' });
    expect(reads.contributeOpen).toHaveBeenCalledOnce();
  });
});

describe("the visitor's public lists", () => {
  it("asks for a language's day list without a viewer, kept for minutes", async () => {
    const list = { language: 'Go', items: [], total: 12 };
    graphqlDirect.mockResolvedValueOnce({ learnPublicIssues: list });
    expect(await readLearnPublicIssues('Go')).toEqual({ ok: true, data: list });
    expect(graphqlDirect).toHaveBeenCalledWith(expect.anything(), { language: 'Go' }, { source: 'ssr' });
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('minutes');
  });

  it('keeps a failed read for seconds only, and says it failed', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await readLearnPublicIssues('Go')).toEqual({ ok: false });
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('seconds');
  });

  it("passes on the API's null (no list for the language now)", async () => {
    graphqlDirect.mockResolvedValueOnce({ learnPublicIssues: null });
    expect(await readLearnPublicIssues('Ruby')).toEqual({ ok: true, data: null });
  });

  it('asks for the 30 public practice lessons once, the page showing a few at a time', async () => {
    const practice = { items: [], total: 0 };
    graphqlDirect.mockResolvedValueOnce({ learnPublicPractice: practice });
    expect(await readLearnPublicPractice('Rust')).toEqual({ ok: true, data: practice });
    expect(graphqlDirect).toHaveBeenCalledWith(
      expect.anything(),
      { language: 'Rust', first: LEARN_PUBLIC_PRACTICE_MAX },
      { source: 'ssr' },
    );
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await readLearnPublicPractice('Rust')).toEqual({ ok: false });
  });
});
