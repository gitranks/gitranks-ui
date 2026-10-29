import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import * as api from './__fixtures__/api-grant-seal';
import { sealedGrantAccount } from './grant-account';

const RING = `k1:${randomBytes(32).toString('base64')}`;
const TOKEN = 'gho_16C7e42F292c6912E7710c838347Ae178B4a';

describe('sealedGrantAccount', () => {
  it('keeps no token in the clear, and nothing an OAuth App token does not have', () => {
    const row = sealedGrantAccount(
      {
        provider: 'github-contribute',
        type: 'oauth',
        providerAccountId: '583231',
        userId: 'u1',
        access_token: TOKEN,
        refresh_token: 'ghr_x',
        expires_at: 1,
        scope: 'public_repo',
        token_type: 'bearer',
        expires_in: 28800,
      } as never,
      { githubLogin: 'octocat' },
      RING,
    );

    expect(Object.keys(row).sort()).toEqual(
      ['access_token', 'githubLogin', 'provider', 'providerAccountId', 'scope', 'token_type', 'type', 'userId'].sort(),
    );
    expect(api.openGrant(row.access_token, api.grantAadOf('583231'), api.sealKeyRingOf(RING)!)?.token).toBe(TOKEN);
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
