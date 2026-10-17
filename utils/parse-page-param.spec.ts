import { describe, expect, it } from 'vitest';

import { parsePageParam } from './parse-page-param';

describe('parsePageParam', () => {
  it('reads positive integers', () => {
    expect(parsePageParam('1')).toBe(1);
    expect(parsePageParam('42')).toBe(42);
  });

  it('rejects anything that is not a canonical page number', () => {
    for (const value of [undefined, '', '0', '01', '-1', '1.5', '2x', 'abc', ' 1', '99999999999999999999']) {
      expect(parsePageParam(value)).toBeNull();
    }
  });
});
