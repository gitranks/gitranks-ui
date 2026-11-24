import { print } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { homeProducts } from './__fixtures__/products-block';

const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));

vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('server-only', () => ({}));

const { loadHomeProducts } = await import('./products-block.data');

describe('loadHomeProducts', () => {
  beforeEach(() => graphqlDirect.mockReset());

  it("asks the API for the person's two cards, as them", async () => {
    graphqlDirect.mockResolvedValueOnce({ homeProducts: homeProducts.both });
    expect(await loadHomeProducts('octocat')).toEqual(homeProducts.both);
    const [document, variables, options] = graphqlDirect.mock.calls[0];
    expect(print(document)).toContain('homeProducts');
    expect(print(document)).toContain('lesson {');
    expect(variables).toBeUndefined();
    expect(options).toEqual({ source: 'client', githubLogin: 'octocat' });
  });

  it('answers none when the API has none, and on any failure', async () => {
    graphqlDirect.mockResolvedValueOnce({ homeProducts: null });
    expect(await loadHomeProducts('octocat')).toBeNull();
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadHomeProducts('octocat')).toBeNull();
  });
});
