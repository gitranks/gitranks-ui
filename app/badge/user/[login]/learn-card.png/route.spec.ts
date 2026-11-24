import { describe, expect, it, vi } from 'vitest';

const { response, read, connection } = vi.hoisted(() => ({
  response: vi.fn(async (..._args: unknown[]) => new Response('png')),
  read: vi.fn(async (_login: string) => ({ brief: null, failed: false, learnOpen: true })),
  connection: vi.fn(async () => undefined),
}));
vi.mock('next/server', async (importOriginal) => ({ ...(await importOriginal<object>()), connection }));
vi.mock('@/components/skills/skills-card-response', () => ({ oldLearnCardResponse: response }));
vi.mock('@/lib/skills/skills-card.data', () => ({ loadSkillsCard: read }));

const { GET } = await import('./route');

describe('the old Learn picture', () => {
  it("answers the login's Skills picture, on request, from the Skills page's cached read", async () => {
    const answer = await GET(new Request('https://gitranks.com/badge/user/octocat/learn-card.png?v=2-3-1'), {
      params: Promise.resolve({ login: 'octocat' }),
    } as never);
    expect(answer.status).toBe(200);
    expect(connection).toHaveBeenCalledOnce();
    expect(response).toHaveBeenCalledWith('octocat', read);
  });
});
