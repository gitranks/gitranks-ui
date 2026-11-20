import { describe, expect, it } from 'vitest';

import { followReturnOf, followReturnPathOf } from './follow-return';

describe('followReturnPathOf', () => {
  it('keeps the path and query, adds the mark, and drops the host and hash', () => {
    expect(followReturnPathOf('https://gitranks.com/package/npm/react?tab=x#used')).toBe(
      '/package/npm/react?tab=x&follow=email',
    );
  });

  it('does not add the mark twice', () => {
    expect(followReturnPathOf('https://gitranks.com/repo/a/b?follow=email')).toBe('/repo/a/b?follow=email');
  });
});

describe('followReturnOf', () => {
  it('reads the mark and gives the address without it', () => {
    expect(followReturnOf('https://gitranks.com/package/npm/react?tab=x&follow=email#used')).toEqual({
      returned: true,
      cleaned: '/package/npm/react?tab=x#used',
    });
  });

  it('takes out a mark of another value without opening the dialog', () => {
    expect(followReturnOf('https://gitranks.com/package/npm/react?follow=1')).toEqual({
      returned: false,
      cleaned: '/package/npm/react',
    });
  });

  it('leaves an address without the mark alone', () => {
    expect(followReturnOf('https://gitranks.com/package/npm/react')).toEqual({ returned: false, cleaned: null });
  });
});
