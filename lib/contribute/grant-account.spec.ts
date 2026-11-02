import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import * as api from './__fixtures__/api-grant-seal';
import { sealedGrantAccount } from './grant-account';
import { grantRefreshAadOf } from './grant-seal';

const RING = `k1:${randomBytes(32).toString('base64')}`;
const TOKEN = 'gho_16C7e42F292c6912E7710c838347Ae178B4a';
const REFRESH = 'ghr_1B4a2e77838347a7E420ce178F2E7c6912E169b6Bd1D7';

describe('sealedGrantAccount', () => {
  const ring = () => api.sealKeyRingOf(RING)!;
  const accountOf = (patch: Record<string, unknown> = {}) =>
    ({
      provider: 'github-contribute',
      type: 'oauth',
      providerAccountId: '583231',
      userId: 'u1',
      access_token: TOKEN,
      scope: 'public_repo',
      token_type: 'bearer',
      ...patch,
    }) as never;

  it('keeps the refresh token sealed under its own associated data, and the expiry, but no token in the clear', () => {
    const row = sealedGrantAccount(
      accountOf({
        refresh_token: REFRESH,
        expires_at: 1_793_000_000,
        expires_in: 28800,
        refresh_token_expires_in: 15_897_600,
        id_token: 'id',
        session_state: 'state',
      }),
      { githubLogin: 'octocat' },
      RING,
    );

    expect(Object.keys(row).sort()).toEqual(
      [
        'access_token',
        'expires_at',
        'githubLogin',
        'provider',
        'providerAccountId',
        'refresh_token',
        'scope',
        'token_type',
        'type',
        'userId',
      ].sort(),
    );
    expect(row.expires_at).toBe(1_793_000_000);
    expect(JSON.stringify(row)).not.toContain(TOKEN);
    expect(JSON.stringify(row)).not.toContain(REFRESH);
    expect(row.refresh_token).toMatch(/^v1\.k1\./);

    expect(grantRefreshAadOf('583231')).toBe('github-contribute:583231:refresh');
    expect(api.openGrant(row.refresh_token, grantRefreshAadOf('583231'), ring())?.token).toBe(REFRESH);
    expect(api.openGrant(row.refresh_token, api.grantAadOf('583231'), ring())).toBeNull();
    expect(api.openGrant(row.refresh_token, grantRefreshAadOf('583232'), ring())).toBeNull();
    expect(api.openGrant(row.access_token, api.grantAadOf('583231'), ring())?.token).toBe(TOKEN);
    expect(api.openGrant(row.access_token, grantRefreshAadOf('583231'), ring())).toBeNull();
  });

  it('writes the row as before for a grant without a refresh token or an expiry', () => {
    const row = sealedGrantAccount(accountOf({ expires_in: 28800 }), { githubLogin: 'octocat' }, RING);

    expect(Object.keys(row).sort()).toEqual(
      ['access_token', 'githubLogin', 'provider', 'providerAccountId', 'scope', 'token_type', 'type', 'userId'].sort(),
    );
    expect(api.openGrant(row.access_token, api.grantAadOf('583231'), ring())?.token).toBe(TOKEN);
  });

  it.each([
    ['an empty refresh token and a zero expiry', { refresh_token: '', expires_at: 0 }],
    ['a negative expiry', { expires_at: -1 }],
    ['an expiry that is not a finite number', { expires_at: Number.POSITIVE_INFINITY }],
    ['an expiry that is not a number', { expires_at: '1793000000' }],
    ['a refresh token that is not a string', { refresh_token: 42 }],
  ])('keeps neither field from %s', (_case, patch) => {
    const row = sealedGrantAccount(accountOf(patch), {}, RING);

    expect(row).not.toHaveProperty('refresh_token');
    expect(row).not.toHaveProperty('expires_at');
  });

  it('refuses a grant without a token', () => {
    expect(() =>
      sealedGrantAccount(
        { provider: 'github-contribute', type: 'oauth', providerAccountId: '1', userId: 'u1' },
        {},
        RING,
      ),
    ).toThrow(/without a token/);
  });
});
