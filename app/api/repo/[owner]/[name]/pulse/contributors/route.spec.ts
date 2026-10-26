import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { facts } from '@/components/pulse/pulse.fixtures';

const { fetchRepoPulseContributors } = vi.hoisted(() => ({ fetchRepoPulseContributors: vi.fn() }));

vi.mock('@/graphql/helpers/fetch-repo-pulse', () => ({ fetchRepoPulseContributors }));

const { GET } = await import('./route');

const call = (owner: string, name: string, search: string) =>
  GET(new NextRequest(`https://gitranks.com/api/repo/${owner}/${name}/pulse/contributors${search}`), {
    params: Promise.resolve({ owner, name }),
  });

const page = { total: 3, unlinkedAuthors: 4, labels: ['TypeScript'], items: facts.topContributors };

describe('repo pulse contributors route', () => {
  beforeEach(() => {
    fetchRepoPulseContributors.mockReset();
  });

  it('answers the page asked for', async () => {
    fetchRepoPulseContributors.mockResolvedValueOnce(page);

    const response = await call(
      'octo',
      'hello',
      '?period=LAST_60_MONTHS&sortBy=PULL_REQUESTS&label=Rust&first=25&offset=25',
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ page });
    expect(fetchRepoPulseContributors).toHaveBeenCalledWith(
      'octo',
      'hello',
      'LAST_60_MONTHS',
      'PULL_REQUESTS',
      'Rust',
      25,
      25,
    );
  });

  it('reads every language when no label is given', async () => {
    fetchRepoPulseContributors.mockResolvedValueOnce(null);

    const response = await call('octo', 'hello', '?period=LAST_12_MONTHS&sortBy=LINES&first=0&offset=0');

    expect(await response.json()).toEqual({ page: null });
    expect(fetchRepoPulseContributors).toHaveBeenCalledWith('octo', 'hello', 'LAST_12_MONTHS', 'LINES', null, 0, 0);
  });

  it('refuses a repository GitHub could not name with 400', async () => {
    const response = await call('octo', 'hello world', '?period=LAST_12_MONTHS&sortBy=LINES');

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: 'Invalid repository' });
    expect(fetchRepoPulseContributors).not.toHaveBeenCalled();
  });

  it.each([
    '?sortBy=LINES',
    '?period=LAST_12_MONTHS',
    '?period=LAST_12_MONTHS&sortBy=STARS',
    '?period=LAST_12_MONTHS&sortBy=LINES&first=-5',
  ])('refuses the query "%s" with 400', async (search) => {
    const response = await call('octo', 'hello', search);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: 'Invalid query' });
    expect(fetchRepoPulseContributors).not.toHaveBeenCalled();
  });

  it('answers 502 when the page cannot be read', async () => {
    fetchRepoPulseContributors.mockRejectedValueOnce(new Error('GraphQL error! 500'));

    const response = await call('octo', 'hello', '?period=LAST_3_MONTHS&sortBy=COMMITS');

    expect(response.status).toBe(502);
  });
});
