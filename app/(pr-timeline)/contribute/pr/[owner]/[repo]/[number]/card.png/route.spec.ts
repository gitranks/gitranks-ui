import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { response, read, connection } = vi.hoisted(() => ({
  response: vi.fn(async (..._args: unknown[]) => new Response('png')),
  read: vi.fn(async () => ({ fix: null, failed: false, learnOpen: true })),
  connection: vi.fn(async () => undefined),
}));
vi.mock('next/server', async (importOriginal) => ({ ...(await importOriginal<object>()), connection }));
vi.mock('@/components/learn/share/fix-card-response', () => ({ fixCardResponse: response }));
vi.mock('@/lib/learn/fix-share.data', () => ({ loadFixCard: read }));

const { GET } = await import('./route');

const get = (owner: string, repo: string, number: string, search = '?v=abc') =>
  GET(new NextRequest(`https://0.0.0.0:3000/contribute/pr/${owner}/${repo}/${number}/card.png${search}`), {
    params: Promise.resolve({ owner, repo, number }),
  } as never);

beforeEach(() => {
  response.mockClear();
  connection.mockClear();
});

describe("a fix's picture", () => {
  it("is the pull request's own, for its address and the query asked, answered on request", async () => {
    await get('harbor-kit', 'relay', '436');
    expect(connection).toHaveBeenCalledOnce();
    const [pr, path, search, load] = response.mock.calls[0] as unknown[];
    expect(pr).toEqual({ nameWithOwner: 'harbor-kit/relay', number: 436 });
    expect([path, search]).toEqual(['/contribute/pr/harbor-kit/relay/436/card.png', '?v=abc']);
    expect(load).toBe(read);
  });

  it('names no pull request for an address none can have', async () => {
    for (const number of ['0', '042', 'x']) {
      await get('harbor-kit', 'relay', number);
      expect(response.mock.lastCall?.[0], number).toBeNull();
    }
  });
});
