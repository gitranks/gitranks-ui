import { describe, expect, it } from 'vitest';

import { awaitsRead } from './facts';
import { orgBig, orgUnranked, repoBig, repoMid, repoUnranked, userMid, userUnranked } from './fixtures';

describe('awaitsRead', () => {
  it('is a repository whose star history GitRanks has not read', () => {
    expect(awaitsRead(repoMid)).toBe(true);
    expect(awaitsRead(repoUnranked)).toBe(true);
    expect(awaitsRead(repoBig)).toBe(false);
  });

  it('is a developer without a single count yet, not one below every ranking', () => {
    expect(awaitsRead({ ...userMid, s: null, c: null, f: null })).toBe(true);
    expect(awaitsRead(userUnranked)).toBe(false);
    expect(awaitsRead(userMid)).toBe(false);
  });

  it('is never an organization', () => {
    expect(awaitsRead(orgBig)).toBe(false);
    expect(awaitsRead(orgUnranked)).toBe(false);
  });
});
