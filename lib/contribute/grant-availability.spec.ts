import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { isGrantAvailable } from './grant-availability';

const ENV = {
  AUTH_GITHUB_CONTRIBUTE_ID: 'id',
  AUTH_GITHUB_CONTRIBUTE_SECRET: 'secret',
  CONTRIBUTE_GRANT_SEAL_KEYS: `k1:${randomBytes(32).toString('base64')}`,
};

describe('isGrantAvailable', () => {
  it('needs the app id, its secret and a key ring that parses', () => {
    expect(isGrantAvailable(ENV)).toBe(true);
    expect(isGrantAvailable({ ...ENV, AUTH_GITHUB_CONTRIBUTE_ID: undefined })).toBe(false);
    expect(isGrantAvailable({ ...ENV, AUTH_GITHUB_CONTRIBUTE_SECRET: '' })).toBe(false);
    expect(isGrantAvailable({ ...ENV, CONTRIBUTE_GRANT_SEAL_KEYS: undefined })).toBe(false);
    expect(isGrantAvailable({ ...ENV, CONTRIBUTE_GRANT_SEAL_KEYS: 'k1:short' })).toBe(false);
  });
});
