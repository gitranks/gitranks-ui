import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch } = vi.hoisted(() => ({ signedFetch: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth: (handler: unknown) => handler }));
vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));

const { GET } = await import('./route');

type Handler = (req: unknown, ctx: { params: Promise<{ proofId: string; slot: string }> }) => Promise<Response>;
const get = (login: string | null, proofId = 'PF_1', slot = '2') =>
  (GET as unknown as Handler)(
    { auth: login ? { user: { githubLogin: login } } : null },
    { params: Promise.resolve({ proofId, slot }) },
  );

describe("a proof's screenshot", () => {
  beforeEach(() => signedFetch.mockReset());

  it('is read for the signed-in user alone and passed on, never cached or run', async () => {
    signedFetch.mockResolvedValue(
      new Response(new Uint8Array([137, 80]), { headers: { 'content-type': 'image/png' } }),
    );
    const response = await get('octocat');
    expect(signedFetch).toHaveBeenCalledWith(
      '/contribute/proofs/PF_1/files/2',
      { cache: 'no-store' },
      'client',
      'octocat',
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-security-policy')).toBe("default-src 'none'");
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([137, 80]));
  });

  it('asks nothing signed out, or for a malformed address', async () => {
    expect((await get(null)).status).toBe(401);
    expect((await get('octocat', '../x')).status).toBe(404);
    expect((await get('octocat', 'PF_1', '12')).status).toBe(404);
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it("answers 404 for another user's proof, and refuses anything that is not an image", async () => {
    signedFetch.mockResolvedValueOnce(new Response(null, { status: 403 }));
    expect((await get('octocat')).status).toBe(404);
    signedFetch.mockResolvedValueOnce(new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } }));
    expect((await get('octocat')).status).toBe(502);
  });
});
