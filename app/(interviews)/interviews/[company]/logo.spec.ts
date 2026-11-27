import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, everyone } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  everyone: vi.fn(async (_now: number) => false),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/interviews/interviews-everyone', () => ({ interviewsOpenToEveryone: everyone }));

type Route = (req: Request, ctx: { params: Promise<{ company: string }> }) => Promise<Response>;
const { GET: logo64 } = (await import('./logo-64.png/route')) as unknown as { GET: Route };
const { GET: logo128 } = (await import('./logo-128.png/route')) as unknown as { GET: Route };
const { LOGO_PNG_BASE64 } = await import('@/lib/interviews/__fixtures__/companies');

const ask = (route: Route, company: string) =>
  route(new Request(`https://gitranks.com/interviews/${company}/logo.png`), {
    params: Promise.resolve({ company }),
  });

beforeEach(() => {
  graphqlDirect.mockReset();
  everyone.mockReset();
  everyone.mockResolvedValue(false);
});

describe("a company's logo files", () => {
  it('ask the API for their own size, and answer the PNG kept by no one while Interviews is closed', async () => {
    graphqlDirect.mockResolvedValue({ interviewLogo: LOGO_PNG_BASE64 });
    const small = await ask(logo64, 'northwind');
    expect(graphqlDirect.mock.calls[0][1]).toEqual({ company: 'northwind', size: 64 });
    expect(small.status).toBe(200);
    expect(small.headers.get('Content-Type')).toBe('image/png');
    expect(small.headers.get('Cache-Control')).toBe('private, no-store');

    await ask(logo128, 'northwind');
    expect(graphqlDirect.mock.calls[1][1]).toEqual({ company: 'northwind', size: 128 });
  });

  it('are kept publicly once Interviews is open to everyone', async () => {
    everyone.mockResolvedValue(true);
    graphqlDirect.mockResolvedValue({ interviewLogo: LOGO_PNG_BASE64 });
    expect((await ask(logo128, 'northwind')).headers.get('Cache-Control')).toMatch(/^public, /);
  });

  it('answer 404, kept by no one, with no logo or for an address that is no company', async () => {
    everyone.mockResolvedValue(true);
    graphqlDirect.mockResolvedValue({ interviewLogo: null });
    const none = await ask(logo64, 'tallgrass');
    expect(none.status).toBe(404);
    expect(none.headers.get('Cache-Control')).toBe('private, no-store');
    graphqlDirect.mockClear();
    expect((await ask(logo64, 'about')).status).toBe(404);
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});
