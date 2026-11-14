import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { GET } = await import('./route');
const { LearnRecordDocument } = await import('@/lib/learn/learn.documents');

const get = (login: string) =>
  GET(new Request(`https://gitranks.com/api/learn/record/${login}`), { params: Promise.resolve({ login }) });

const RECORD = { lessons: 4, topics: ['Cache keys'], prsOpened: 3, prsMerged: 2 };

describe("the route for a login's Learn record", () => {
  beforeEach(() => graphqlDirect.mockReset());

  it('reads anonymously, the same answer for everyone, kept a minute', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnRecord: RECORD });
    const response = await get('octocat');
    expect(await response.json()).toEqual({ record: RECORD });
    expect(response.headers.get('cache-control')).toBe('public, max-age=60');
    expect(graphqlDirect).toHaveBeenCalledWith(LearnRecordDocument, { login: 'octocat' }, { source: 'client' });
  });

  it('answers none without a public pass, or for anything that is not a login', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnRecord: null });
    expect(await (await get('octocat')).json()).toEqual({ record: null });
    expect(await (await get('a.b')).json()).toEqual({ record: null });
    expect(graphqlDirect).toHaveBeenCalledOnce();
  });

  it('answers none, never an error and never kept, when the API does not know the field yet', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('Cannot query field "learnRecord" on type "Query".'));
    const response = await get('octocat');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ record: null });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
