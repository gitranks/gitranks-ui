import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  order: [] as string[],
  connection: vi.fn(async () => {
    m.order.push('connection');
  }),
  graphqlDirect: vi.fn(),
  contributeLedgerOpen: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ connection: m.connection }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: m.graphqlDirect }));
vi.mock('./ledger-gate', () => ({ contributeLedgerOpen: m.contributeLedgerOpen }));

// `cache` keeps one answer per request in the app; each spec here asks afresh.
vi.mock('react', async (original) => ({ ...(await original<object>()), cache: <T>(read: T) => read }));

const { LANDING_PROOF_TIMEOUT_MS, loadLandingLedgerOpen, loadLandingProof } = await import('./landing-proof.data');

beforeEach(() => {
  m.order.length = 0;
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());

describe("the landing's proof read", () => {
  it('leaves any prerender before it signs a request, and asks with a 1.5 second limit and no viewer', async () => {
    m.graphqlDirect.mockImplementation(async () => {
      m.order.push('fetch');
      return { contributeNewestMerged: [] };
    });
    expect(await loadLandingProof()).toEqual([]);
    expect(m.order).toEqual(['connection', 'fetch']);
    const [, , params] = m.graphqlDirect.mock.calls[0];
    expect(params).toMatchObject({ source: 'ssr' });
    expect(params).not.toHaveProperty('githubLogin');
    expect(params.signal).toBeInstanceOf(AbortSignal);
    expect(LANDING_PROOF_TIMEOUT_MS).toBe(1_500);
  });

  it('answers null for a failed or cut-off read, and for an API that answered null', async () => {
    m.graphqlDirect.mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'));
    expect(await loadLandingProof()).toBeNull();
    m.graphqlDirect.mockResolvedValueOnce({ contributeNewestMerged: null });
    expect(await loadLandingProof()).toBeNull();
  });
});

describe("the ledger's answer for the landing", () => {
  it('leaves any prerender before it reads the clock, and passes the answer on', async () => {
    m.contributeLedgerOpen.mockImplementation(async () => {
      m.order.push('ask');
      return true;
    });
    expect(await loadLandingLedgerOpen()).toBe(true);
    expect(m.order).toEqual(['connection', 'ask']);
  });

  it('is closed when the answer fails', async () => {
    m.contributeLedgerOpen.mockRejectedValueOnce(new Error('down'));
    expect(await loadLandingLedgerOpen()).toBe(false);
  });

  it('is closed when the answer takes longer than the proof may', async () => {
    vi.useFakeTimers();
    m.contributeLedgerOpen.mockReturnValueOnce(new Promise(() => {}));
    const answer = loadLandingLedgerOpen();
    await vi.advanceTimersByTimeAsync(LANDING_PROOF_TIMEOUT_MS);
    expect(await answer).toBe(false);
  });
});
