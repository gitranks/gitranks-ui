import { randomBytes } from 'node:crypto';

import type { Adapter, AdapterAccount } from 'next-auth/adapters';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from './__fixtures__/api-grant-seal';
import { GRANT_REFUSED_PATH, grantSignInAllowed, withContributeGrant } from './grant-adapter';
import authConfig from '@/auth.config';

const RING = `k1:${randomBytes(32).toString('base64')}`;
const TOKEN = 'gho_16C7e42F292c6912E7710c838347Ae178B4a';
const SESSION = { sub: 'user-1', githubLogin: 'OctoCat', authMode: 'identity' as const };

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
  linkAccount: vi.fn(async (_account: AdapterAccount) => {
    calls.push('link');
  }),
  unlinkAccount: vi.fn(async (_account: Pick<AdapterAccount, 'provider' | 'providerAccountId'>) => {
    calls.push('unlink');
  }),
} satisfies Partial<Adapter>;

const readSession = vi.fn();
const adapter = withContributeGrant(base as Adapter, readSession);

describe('the GitHub grant in Auth.js (pull request access)', () => {
  beforeEach(() => {
    process.env.CONTRIBUTE_GRANT_SEAL_KEYS = RING;
    calls.length = 0;
    base.linkAccount.mockClear();
    base.unlinkAccount.mockClear();
    base.getUserByAccount.mockClear();
    readSession.mockReset();
    readSession.mockResolvedValue(SESSION);
  });

  it('is a third GitHub provider asking for public_repo only, never workflow', () => {
    const provider = (authConfig.providers as unknown as { options?: Record<string, any> }[]).find(
      (entry) => entry.options?.id === 'github-contribute',
    );
    const scope = provider?.options?.authorization?.params?.scope;

    expect(scope).toBe('public_repo');
    expect(scope).not.toMatch(/workflow/);
  });

  it('is linked only from a signed-in session, for the same GitHub account', async () => {
    readSession.mockResolvedValue(null);
    expect(await grantSignInAllowed({ login: 'octocat' }, readSession)).toBe(GRANT_REFUSED_PATH);

    readSession.mockResolvedValue(SESSION);
    expect(await grantSignInAllowed({ login: 'someone-else' }, readSession)).toBe(GRANT_REFUSED_PATH);
    expect(await grantSignInAllowed(undefined, readSession)).toBe(GRANT_REFUSED_PATH);
    expect(await grantSignInAllowed({ login: 'octocat' }, readSession)).toBe(true);
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

  it('replaces the row of a grant given again, so the new token is the one kept', async () => {
    await adapter.linkAccount?.(grantAccount());

    expect(calls).toEqual(['unlink', 'link']);
    expect(base.unlinkAccount).toHaveBeenCalledWith({ provider: 'github-contribute', providerAccountId: '583231' });
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
    expect(base.unlinkAccount).not.toHaveBeenCalled();
  });
});
