import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch, currentMaintainerToken } = vi.hoisted(() => ({
  signedFetch: vi.fn(),
  currentMaintainerToken: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));
vi.mock('./maintainer-token', () => ({ currentMaintainerToken }));
vi.mock('next/cache', () => ({ cacheLife: () => {} }));

const { loadMaintainerFacts, loadPrReport, loadPrStrip } = await import('./pr-feedback.data');
const { maintainerFacts, prCard, prViewer } = await import('./__fixtures__/maintainers');

const TOKEN = 'gho_maintainerPageToken123';
const FROM = '6650a1b2c3d4e5f6a7b8c9d0';
const bodies = () =>
  signedFetch.mock.calls.map(
    ([, init]) => JSON.parse((init as RequestInit).body as string) as { query: string; variables: object },
  );
const refused = (code: string) =>
  Response.json({ data: null, errors: [{ message: `refused ${TOKEN}`, extensions: { code } }] });

beforeEach(() => {
  signedFetch.mockReset();
  currentMaintainerToken.mockReset();
  currentMaintainerToken.mockResolvedValue(null);
});

describe("the maintainers page's reads", () => {
  it('reads the facts for everyone, and nothing when the API does not answer', async () => {
    signedFetch.mockResolvedValueOnce(Response.json({ data: { contributeMaintainerFacts: maintainerFacts() } }));
    expect(await loadMaintainerFacts()).toEqual(maintainerFacts());

    signedFetch.mockResolvedValueOnce(new Response('', { status: 502 }));
    expect(await loadMaintainerFacts()).toBeNull();
  });

  it('reads a footer link’s PR without a token, and shows no strip for anything else', async () => {
    signedFetch.mockResolvedValueOnce(Response.json({ data: { contributePrCard: { card: prCard(), viewer: null } } }));
    expect(await loadPrStrip(FROM)).toEqual(prCard());
    expect(bodies()[0].variables).toEqual({ from: FROM });

    signedFetch.mockResolvedValueOnce(refused('NOT_FOUND'));
    expect(await loadPrStrip(FROM)).toBeNull();
    for (const from of [undefined, '', 'R_1', ['x'], `${FROM}0`]) expect(await loadPrStrip(from)).toBeNull();
    expect(signedFetch).toHaveBeenCalledTimes(2);
  });

  it('reads the report page’s PR with the token as a variable, and the visitor’s role', async () => {
    currentMaintainerToken.mockResolvedValue(TOKEN);
    signedFetch.mockResolvedValueOnce(
      Response.json({ data: { contributePrCard: { card: prCard(), viewer: prViewer() } } }),
    );

    const read = await loadPrReport({ pr: { nameWithOwner: 'driftwood-js/driftwood', number: 912 } });

    expect(read).toEqual({ state: 'found', card: prCard(), viewer: prViewer() });
    expect(bodies()[0].variables).toEqual({ pr: 'driftwood-js/driftwood#912', token: TOKEN });
    expect(bodies()[0].query).not.toContain(TOKEN);
  });

  it('asks a visitor without the sign-in to sign in, with the card a footer link names', async () => {
    signedFetch.mockResolvedValueOnce(Response.json({ data: { contributePrCard: { card: prCard(), viewer: null } } }));
    expect(await loadPrReport({ from: FROM })).toEqual({ state: 'signed-out', card: prCard() });

    expect(await loadPrReport({ pr: { nameWithOwner: 'a/b', number: 1 } })).toEqual({
      state: 'signed-out',
      card: null,
    });
    signedFetch.mockResolvedValueOnce(refused('NOT_FOUND'));
    expect(await loadPrReport({ from: FROM })).toEqual({ state: 'failed', error: 'NOT_OURS', card: null });
  });

  it('tells a signed-out visitor an outage as one to try again, never as a PR we did not open', async () => {
    for (const failure of [refused('SERVICE_UNAVAILABLE'), new Response('', { status: 502 })]) {
      signedFetch.mockResolvedValueOnce(failure);
      expect(await loadPrReport({ from: FROM })).toEqual({ state: 'failed', error: 'FAILED', card: null });
    }
  });

  it('gives up on a slow strip or facts read rather than hold the page', async () => {
    vi.useFakeTimers();
    try {
      signedFetch.mockReturnValue(new Promise(() => {}));
      const strip = loadPrStrip(FROM);
      const facts = loadMaintainerFacts();
      await vi.advanceTimersByTimeAsync(2500);
      expect(await strip).toBeNull();
      expect(await facts).toBeNull();
    } finally {
      vi.useRealTimers();
      signedFetch.mockReset();
    }
  });

  it.each([
    ['SERVICE_UNAVAILABLE', 'GITHUB_UNAVAILABLE'],
    ['UNAUTHENTICATED', 'SIGNED_OUT'],
    ['NOT_FOUND', 'NOT_OURS'],
  ])('tells %s as %s, never in the words of the answer', async (code, error) => {
    currentMaintainerToken.mockResolvedValue(TOKEN);
    signedFetch.mockResolvedValueOnce(refused(code));

    const read = await loadPrReport({ from: FROM });

    expect(read).toEqual({ state: 'failed', error, card: null });
    expect(JSON.stringify(read)).not.toContain(TOKEN);
  });
});
