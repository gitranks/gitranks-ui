import { expect, test } from 'vitest';

import { loginFromPath } from './login-from-path';

test('decodes a login, and leaves a malformed escape as it is', () => {
  expect(loginFromPath('octo%2Dcat')).toBe('octo-cat');
  expect(loginFromPath('octo-cat')).toBe('octo-cat');
  expect(loginFromPath('bad%E0%A4%A')).toBe('bad%E0%A4%A');
});
