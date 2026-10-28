import { describe, expect, it } from 'vitest';

import { isImpossibleEntityPath } from './entity-routes';

describe('isImpossibleEntityPath', () => {
  it.each([
    '/profile/wp-login.php',
    '/profile/a_b',
    '/profile/-a',
    '/org/.env',
    '/insights/_',
    '/insights/6650f0c2a1b2c3d4e5f6071',
  ])('rejects %s', (path) => {
    expect(isImpossibleEntityPath(path)).toBe(true);
  });

  it.each([
    '/profile/torvalds',
    '/profile/torvalds/languages/country',
    '/org/vercel',
    '/insights/6650f0c2a1b2c3d4e5f60718',
    '/insights',
    '/profile',
    '/repo/x/.env',
    '/by/stars/1',
  ])('leaves %s to the routes', (path) => {
    expect(isImpossibleEntityPath(path)).toBe(false);
  });
});
