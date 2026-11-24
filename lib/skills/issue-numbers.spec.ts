import { describe, expect, it } from 'vitest';

import { skillsIssueNumbers } from './__fixtures__/skills';
import { issueCellsOf, issuesTextOf, keptLineOf, listUsersOf, roundedOf } from './issue-numbers';

describe('roundedOf', () => {
  it('rounds to two significant digits, in millions from a million', () => {
    expect(roundedOf(51_270)).toBe('51,000');
    expect(roundedOf(2_800)).toBe('2,800');
    expect(roundedOf(2_499)).toBe('2,500');
    expect(roundedOf(7)).toBe('7');
    expect(roundedOf(2_340_000)).toBe('2.3 million');
    expect(roundedOf(1_000_000)).toBe('1 million');
    expect(roundedOf(995_000)).toBe('1 million');
    expect(roundedOf(999_999)).toBe('1 million');
    expect(roundedOf(994_999)).toBe('990,000');
  });
});

describe('issueCellsOf', () => {
  it('gives the four cells in order', () => {
    expect(issueCellsOf(skillsIssueNumbers)).toEqual([
      { value: '51,000', label: 'repositories watched' },
      { value: '2.3 million', label: 'issues checked so far' },
      { value: '2,800', label: 'read by AI each day' },
      { value: '2,500', label: 'ready to fix today' },
    ]);
  });

  it('leaves out a number not counted yet, or a zero, and has none without numbers', () => {
    const cells = issueCellsOf({ ...skillsIssueNumbers, repos: null, aiReadsPerDay: 0 });
    expect(cells.map((cell) => cell.label)).toEqual(['issues checked so far', 'ready to fix today']);
    expect(issueCellsOf(null)).toEqual([]);
  });
});

describe('keptLineOf', () => {
  it('words the share by the shared rule', () => {
    expect(keptLineOf(skillsIssueNumbers)).toBe('About 1 issue in 1,000 makes the list.');
    expect(keptLineOf({ read: 1_000, kept: 3 })).toBe('About 0.3% of them make the list.');
  });

  it('says nothing before anything was read', () => {
    expect(keptLineOf({ read: 0, kept: 0 })).toBeNull();
    expect(keptLineOf(null)).toBeNull();
  });
});

describe('issuesTextOf', () => {
  it('names both products while Learn is open, and Contribute alone otherwise', () => {
    expect(listUsersOf(true)).toBe('GitRanks Contribute and GitRanks Learn take their issues from it.');
    expect(listUsersOf(false)).toBe('GitRanks Contribute takes its issues from it.');
    const text = issuesTextOf(skillsIssueNumbers, true);
    expect(text).toContain('Then two AI models, Jev and Claude, read each one that is left');
    expect(text).toContain('About 1 issue in 1,000 makes the list. GitRanks Contribute and GitRanks Learn');
  });

  it('leaves the share out without numbers', () => {
    const text = issuesTextOf(null, false);
    expect(text).not.toContain('About');
    expect(text.endsWith('GitRanks Contribute takes its issues from it.')).toBe(true);
  });
});
