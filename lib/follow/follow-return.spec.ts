import { describe, expect, it } from 'vitest';

import { followReturnOf, followReturnPathOf } from './follow-return';

describe('followReturnPathOf', () => {
  it('keeps the path and query, adds the mark with the label, and drops the host and hash', () => {
    expect(followReturnPathOf('https://gitranks.com/package/npm/react?tab=x#used', 'react')).toBe(
      '/package/npm/react?tab=x&follow=email%3Areact',
    );
  });

  it('does not add the mark twice', () => {
    expect(followReturnPathOf('https://gitranks.com/repo/a/b?follow=email%3Ax', 'a/b packages')).toBe(
      '/repo/a/b?follow=email%3Aa%2Fb+packages',
    );
  });
});

describe('followReturnOf', () => {
  it('reads the mark of this slot and gives the address without it', () => {
    expect(followReturnOf('https://gitranks.com/package/npm/react?tab=x&follow=email%3Areact#used', 'react')).toEqual({
      returned: true,
      cleaned: '/package/npm/react?tab=x#used',
    });
  });

  it('takes out the mark of another slot without opening the dialog', () => {
    expect(followReturnOf('https://gitranks.com/repo/o/n/used-by?follow=email%3Afoo', 'o/n packages')).toEqual({
      returned: false,
      cleaned: '/repo/o/n/used-by',
    });
  });

  it('leaves an address without the mark alone', () => {
    expect(followReturnOf('https://gitranks.com/package/npm/react', 'react')).toEqual({
      returned: false,
      cleaned: null,
    });
  });
});
