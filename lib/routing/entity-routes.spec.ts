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
    '/package/pypi/requests',
    '/package/NPM/react',
    '/package/npm',
    '/package/npm/.env',
    '/package/npm/_private',
    '/package/npm/wp-login.php%3F',
    '/package/npm/a%20b',
    '/package/npm/node_modules',
    '/package/npm/react/extra',
    '/package/npm/@types',
    '/package/npm/@types/node/extra',
    '/package/npm/.env/facts.md',
    '/package/npm/@types/facts.md/facts.md/x',
    '/package/npm/types/node',
    '/package/npm/%E0%A4%A',
    `/package/npm/${'x'.repeat(215)}`,
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
    '/package',
    '/package/npm/react',
    '/package/npm/react/',
    '/package/npm/@types/node',
    '/package/npm/%40types/node',
    '/package/npm/lodash.debounce',
    '/package/npm/JSONStream',
    '/package/npm/@scope/_private',
    '/package/npm/react/facts.md',
    '/package/npm/@types/node/facts.md',
    '/package/npm/@acme/facts.md',
    `/package/npm/${'x'.repeat(214)}`,
    '/packages/npm/downloads/1',
  ])('leaves %s to the routes', (path) => {
    expect(isImpossibleEntityPath(path)).toBe(false);
  });
});
