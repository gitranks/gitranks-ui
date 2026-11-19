import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const graphqlDirect = vi.fn();
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { askFirstFetch } = await import('./first-fetch');
const { ContributeFirstFetchDocument } = await import('./contribute.documents');

describe('the first read asked on sign-in', () => {
  afterEach(() => {
    graphqlDirect.mockReset();
  });

  it('asks it as the signed-in login, with the email when GitHub gave one', async () => {
    graphqlDirect.mockResolvedValue({ contributeFirstFetch: true });

    await askFirstFetch('newbie', 'newbie@example.com');
    expect(graphqlDirect).toHaveBeenCalledWith(ContributeFirstFetchDocument, undefined, {
      source: 'ssr',
      githubLogin: 'newbie',
      accountEmail: 'newbie@example.com',
    });

    await askFirstFetch('newbie', null);
    expect(graphqlDirect).toHaveBeenLastCalledWith(ContributeFirstFetchDocument, undefined, {
      source: 'ssr',
      githubLogin: 'newbie',
    });
  });

  it('never fails the sign-in, and asks nothing without a login', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    graphqlDirect.mockRejectedValue(new Error('down'));

    await expect(askFirstFetch('newbie')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
    await askFirstFetch(undefined);
    expect(graphqlDirect).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
