import { describe, expect, it } from 'vitest';

import { lineDiffOf } from './line-diff';

describe('the lines of a before-and-after', () => {
  it('marks the lines only in one side, outside the longest common run', () => {
    const before = ['function a() {', '  const key = route.path', '  return build(key)', '}'];
    const after = [
      'function a() {',
      '  const key = normalizePath(route.path)',
      '  const hit = cache.get(key)',
      '  if (hit) return hit',
      '  return build(key)',
      '}',
    ];
    expect(lineDiffOf(before, after)).toEqual({
      removed: [false, true, false, false],
      added: [false, true, true, true, false, false],
    });
  });

  it('ignores trailing spaces, never leading ones', () => {
    expect(lineDiffOf(['a  ', ' b'], ['a', 'b'])).toEqual({ removed: [false, true], added: [false, true] });
  });

  it('keeps the common lines in order: a moved line is removed in one place and added in the other', () => {
    expect(lineDiffOf(['x', 'a', 'b'], ['a', 'b', 'x'])).toEqual({
      removed: [true, false, false],
      added: [false, false, true],
    });
  });

  it('marks every line when nothing is shared, and none when the sides are the same', () => {
    expect(lineDiffOf(['a'], ['b', 'c'])).toEqual({ removed: [true], added: [true, true] });
    expect(lineDiffOf(['a', 'b'], ['a', 'b'])).toEqual({ removed: [false, false], added: [false, false] });
    expect(lineDiffOf([], ['a'])).toEqual({ removed: [], added: [true] });
  });
});
