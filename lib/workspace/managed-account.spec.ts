import { describe, expect, it } from 'vitest';

import { isManagedLogin } from './managed-account';

describe('isManagedLogin', () => {
  it('reads a login with an underscore as a company-managed account', () => {
    expect(isManagedLogin('jane-doe_acme')).toBe(true);
    expect(isManagedLogin('Jane_ACME')).toBe(true);
  });

  it('reads a personal login as a personal account', () => {
    expect(isManagedLogin('jane-doe')).toBe(false);
    expect(isManagedLogin('-Jerry-')).toBe(false);
    expect(isManagedLogin('a1')).toBe(false);
  });
});
