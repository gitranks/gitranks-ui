import { beforeEach, describe, expect, it, vi } from 'vitest';

const graphqlDirect = vi.hoisted(() => vi.fn());
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/seo/site', () => ({ SITE_URL: 'https://gitranks.com' }));

const { GET } = await import('./route');
const { forgetFixGates } = await import('@/lib/learn/fix-gate');

// As behind the proxy: the request URL is the server's bind address, never the site's.
const call = (attemptId: string) =>
  GET(new Request(`https://0.0.0.0:3000/learn/fixes/by-attempt/${attemptId}/answers`), {
    params: Promise.resolve({ attemptId }),
  } as never);

const address = { state: 'LIVE', owner: 'acme', repo: 'widgets', number: 57, login: 'octocat' };

beforeEach(() => {
  graphqlDirect.mockReset();
  forgetFixGates();
});

const expectRedirect = async (answer: Response, location: string) => {
  expect(answer.status).toBe(307);
  expect(answer.headers.get('location')).toBe(location);
  expect(answer.headers.get('cache-control')).toBe('private, no-store');
};

describe("the fixer's answers by attempt", () => {
  it("sends the browser to the answers page on the site's own address, a 307 nobody keeps", async () => {
    graphqlDirect.mockResolvedValue({ learnFixAddress: address });
    await expectRedirect(await call('A_1'), 'https://gitranks.com/learn/fixes/acme/widgets/57/walkthrough/by/octocat');
    expect(graphqlDirect.mock.calls[0][1]).toEqual({ attempt: 'A_1' });
  });

  it('leads private answers there too: the page says they are kept private', async () => {
    graphqlDirect.mockResolvedValue({ learnFixAddress: { ...address, state: 'PRIVATE' } });
    expect((await call('A_1')).status).toBe(307);
  });

  it("sends a removed fix to its walkthrough's address, where its 410 page is answered", async () => {
    graphqlDirect.mockResolvedValue({ learnFixAddress: { ...address, state: 'REMOVED' } });
    await expectRedirect(await call('A_1'), 'https://gitranks.com/learn/fixes/acme/widgets/57/walkthrough');
  });

  it('is a 404 nobody keeps for no pull request yet and an id of another shape', async () => {
    graphqlDirect.mockResolvedValue({ learnFixAddress: { ...address, state: 'MISSING', number: null } });
    for (const id of ['A_1', 'not/an id']) {
      const answer = await call(id);
      expect(answer.status, id).toBe(404);
      expect(answer.headers.get('cache-control'), id).toBe('private, no-store');
    }
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
  });

  it('sends the browser to the pages for maintainers when the API does not answer', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    await expectRedirect(await call('A_1'), 'https://gitranks.com/learn/maintainers');
    graphqlDirect.mockResolvedValueOnce({ learnFixAddress: null });
    await expectRedirect(await call('A_1'), 'https://gitranks.com/learn/maintainers');
  });
});
