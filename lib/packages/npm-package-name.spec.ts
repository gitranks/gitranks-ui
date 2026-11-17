import { describe, expect, it } from 'vitest';

import { isNpmPackageName, NPM_NAME_MAX_LENGTH } from './npm-package-name';

describe('isNpmPackageName', () => {
  it.each([
    'react',
    'react-resize-detector',
    'lodash.debounce',
    'a',
    '1',
    '@types/node',
    '@nebula/ui',
    '@a/b',
    // A scoped name part may start with an underscore.
    '@scope/_private',
    // Older names: capital letters and `~'!()*` are refused for new names only.
    'JSONStream',
    'Base64',
    'pkg~tilde',
    "it's(ok)!*",
    'x'.repeat(NPM_NAME_MAX_LENGTH),
    `@${'s'.repeat(100)}/${'n'.repeat(NPM_NAME_MAX_LENGTH - 102)}`,
  ])('takes %s', (name) => {
    expect(isNpmPackageName(name)).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['over 214 characters', 'x'.repeat(NPM_NAME_MAX_LENGTH + 1)],
    ['over 214 characters with its scope', `@${'s'.repeat(100)}/${'n'.repeat(NPM_NAME_MAX_LENGTH - 101)}`],
    ['a leading period', '.env'],
    ['a leading underscore', '_private'],
    ['a scoped name part with a leading period', '@scope/.hidden'],
    ['a scoped name part that is two periods', '@scope/..'],
    ['a space', 'a b'],
    ['a leading space', ' react'],
    ['a slash without a scope', 'a/b'],
    ['a scope without a name', '@scope'],
    ['a scope with an empty name', '@scope/'],
    ['an empty scope', '@/name'],
    ['a scope with two names', '@scope/a/b'],
    ['an @ inside a name', 'a@b'],
    ['an @ inside a scoped name', '@scope/a@b'],
    ['a character that is not URL-safe', 'a:b'],
    ['a percent sign', 'a%20b'],
    ['a non-ASCII letter', 'café'],
    ['node_modules', 'node_modules'],
    ['favicon.ico', 'FAVICON.ICO'],
    ['a backslash', 'a\\b'],
  ])('refuses a name with %s', (_name, name) => {
    expect(isNpmPackageName(name)).toBe(false);
  });
});
