import { randomBytes } from 'node:crypto';

import type { Adapter, AdapterAccount } from 'next-auth/adapters';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from './__fixtures__/api-grant-seal';
import { GRANT_REFUSED_PATH, GRANT_UNAVAILABLE_PATH, grantSignInAllowed, withContributeGrant } from './grant-adapter';

const RING = `k1:${randomBytes(32).toString('base64')}`;
const TOKEN = 'gho_16C7e42F292c6912E7710c838347Ae178B4a';
const SESSION = { sub: 'user-1', githubLogin: 'OctoCat', authMode: 'identity' as const };
const STORED = { _id: 'row-new', userId: 'stored-user-1' };

const grantAccount = (patch: Partial<AdapterAccount> = {}): AdapterAccount => ({
  provider: 'github-contribute',
  type: 'oauth',
  providerAccountId: '583231',
  userId: 'user-1',
  access_token: TOKEN,
  token_type: 'bearer',
  scope: 'public_repo',
  ...patch,
});

const calls: string[] = [];
const base = {
  getUserByAccount: vi.fn(async () => ({ id: 'user-2', email: 'x', emailVerified: null })),
  linkAccount: vi.fn(async (account: AdapterAccount) => {
    calls.push('insert');
    return { ...account, ...STORED } as AdapterAccount;
  }),
  unlinkAccount: vi.fn(),
} satisfies Partial<Adapter>;

const readSession = vi.fn();
const removeOtherGrants = vi.fn(async () => {
  calls.push('remove others');
});
const adapter = withContributeGrant(base as Adapter, readSession, removeOtherGrants);

const providerScopeOf = async (env: Record<string, string>) => {
  vi.resetModules();
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  const { default: config } = await import('@/auth.config');
  vi.unstubAllEnvs();
  const provider = (config.providers as unknown as { options?: Record<string, any> }[]).find(
    (entry) => entry.options?.id === 'github-contribute',
  );
  return provider ? (provider.options?.authorization?.params?.scope as string) : null;
};

describe('the GitHub grant in Auth.js (pull request access)', () => {
  beforeEach(() => {
    process.env.CONTRIBUTE_GRANT_SEAL_KEYS = RING;
    calls.length = 0;
    base.linkAccount.mockClear();
    base.unlinkAccount.mockClear();
    base.getUserByAccount.mockClear();
    removeOtherGrants.mockClear();
    readSession.mockReset();
    readSession.mockResolvedValue(SESSION);
  });

  it('is a third GitHub provider asking for public_repo only, registered only with its app id and secret', async () => {
    const scope = await providerScopeOf({ AUTH_GITHUB_CONTRIBUTE_ID: 'id', AUTH_GITHUB_CONTRIBUTE_SECRET: 'secret' });
    expect(scope).toBe('public_repo');
    expect(scope).not.toMatch(/workflow/);

    expect(await providerScopeOf({ AUTH_GITHUB_CONTRIBUTE_ID: 'id', AUTH_GITHUB_CONTRIBUTE_SECRET: '' })).toBeNull();
    expect(
      await providerScopeOf({ AUTH_GITHUB_CONTRIBUTE_ID: '', AUTH_GITHUB_CONTRIBUTE_SECRET: 'secret' }),
    ).toBeNull();
  });

  it('is linked only from a signed-in session, for the same GitHub account', async () => {
    const available = () => true;
    readSession.mockResolvedValue(null);
    expect(await grantSignInAllowed({ login: 'octocat' }, readSession, available)).toBe(GRANT_REFUSED_PATH);

    readSession.mockResolvedValue(SESSION);
    expect(await grantSignInAllowed({ login: 'someone-else' }, readSession, available)).toBe(GRANT_REFUSED_PATH);
    expect(await grantSignInAllowed(undefined, readSession, available)).toBe(GRANT_REFUSED_PATH);
    expect(await grantSignInAllowed({ login: 'octocat' }, readSession, available)).toBe(true);
  });

  it('is refused while it cannot be stored here', async () => {
    expect(await grantSignInAllowed({ login: 'octocat' }, readSession, () => false)).toBe(GRANT_UNAVAILABLE_PATH);
  });

  it('never finds a user, so each grant is linked to the signed-in one', async () => {
    expect(await adapter.getUserByAccount?.({ provider: 'github-contribute', providerAccountId: '583231' })).toBeNull();
    expect(base.getUserByAccount).not.toHaveBeenCalled();
    expect(await adapter.getUserByAccount?.({ provider: 'github-basic', providerAccountId: '583231' })).toMatchObject({
      id: 'user-2',
    });
  });

  it('writes the row sealed, with the login, the account id as a string and the provider', async () => {
    await adapter.linkAccount?.(grantAccount({ providerAccountId: 583231 as unknown as string }));

    const row = base.linkAccount.mock.calls[0][0] as AdapterAccount & { githubLogin?: string };
    expect(row).toMatchObject({
      provider: 'github-contribute',
      providerAccountId: '583231',
      githubLogin: 'OctoCat',
      scope: 'public_repo',
      userId: 'user-1',
      type: 'oauth',
    });
    expect(JSON.stringify(row)).not.toContain(TOKEN);
    expect(api.openGrant(row.access_token, api.grantAadOf('583231'), api.sealKeyRingOf(RING)!)?.token).toBe(TOKEN);
  });

  it("inserts the new row first, then removes every other grant row of the user, by the new row's id", async () => {
    await adapter.linkAccount?.(grantAccount());

    expect(calls).toEqual(['insert', 'remove others']);
    expect(removeOtherGrants).toHaveBeenCalledWith({
      provider: 'github-contribute',
      userId: 'stored-user-1',
      keep: 'row-new',
    });
    expect(base.unlinkAccount).not.toHaveBeenCalled();
  });

  it('keeps the old row when the insert fails', async () => {
    base.linkAccount.mockRejectedValueOnce(new Error('write failed'));

    await expect(adapter.linkAccount?.(grantAccount())).rejects.toThrow('write failed');
    expect(removeOtherGrants).not.toHaveBeenCalled();
  });

  it('writes nothing without the key ring, rather than the token in the clear', async () => {
    delete process.env.CONTRIBUTE_GRANT_SEAL_KEYS;

    await expect(adapter.linkAccount?.(grantAccount())).rejects.toThrow(/CONTRIBUTE_GRANT_SEAL_KEYS/);
    expect(calls).toEqual([]);
  });

  it('leaves the other sign-ins to the adapter as they were', async () => {
    const identity = grantAccount({ provider: 'github-basic' });
    await adapter.linkAccount?.(identity);

    expect(base.linkAccount).toHaveBeenCalledWith(identity);
    expect(removeOtherGrants).not.toHaveBeenCalled();
  });
});
