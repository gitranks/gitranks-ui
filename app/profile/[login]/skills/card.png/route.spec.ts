import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

const { response, read, connection } = vi.hoisted(() => ({
  response: vi.fn(async (..._args: unknown[]) => new Response('png')),
  read: vi.fn(async (_login: string) => ({ brief: null, failed: false })),
  connection: vi.fn(async () => undefined),
}));
vi.mock('next/server', async (importOriginal) => ({ ...(await importOriginal<object>()), connection }));
vi.mock('@/components/skills/skills-card-response', () => ({ skillsCardResponse: response }));
vi.mock('@/lib/skills/skills-card.data', () => ({ loadSkillsCard: read }));

const { GET } = await import('./route');

describe("a Skills page's picture", () => {
  it("is the login's own, for the query asked, answered on request from the page's cached read", async () => {
    await GET(new NextRequest('https://0.0.0.0:3000/profile/octocat/skills/card.png?v=abc'), {
      params: Promise.resolve({ login: 'octocat' }),
    } as never);
    expect(connection).toHaveBeenCalledOnce();
    const [login, search, load] = response.mock.calls[0] as [string, string, (login: string) => Promise<unknown>];
    expect([login, search]).toEqual(['octocat', '?v=abc']);
    expect(load).toBe(read);
  });
});
