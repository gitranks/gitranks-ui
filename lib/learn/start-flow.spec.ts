import { describe, expect, it } from 'vitest';

import { ISSUES } from './__fixtures__/home';
import { emptyProfile, filledProfile } from './__fixtures__/profile';
import { learnStartHrefOf } from './learn-tab';
import {
  goalViewOfPick,
  issueStepTargetOf,
  learnGoalPickOf,
  learnGoalPickOfProfile,
  learnGoalQuery,
  learnIssuesOfPublic,
  withLearnGoal,
} from './start-flow';

const pick = (query: string) => learnGoalPickOf(new URLSearchParams(query));

describe("Learn's goal in the address", () => {
  it('reads one of the eight languages in its own spelling, whatever the case, and a level from 0 to 3', () => {
    expect(pick('language=TypeScript&level=1')).toEqual({ language: 'TypeScript', level: 1 });
    expect(pick('language=php&level=3')).toEqual({ language: 'PHP', level: 3 });
    expect(pick('language=go')).toEqual({ language: 'Go', level: null });
  });

  it('drops what it does not know: another language is no goal, an unknown level none', () => {
    expect(pick('language=Cobol&level=1')).toBeNull();
    expect(pick('level=2')).toBeNull();
    expect(pick('')).toBeNull();
    for (const level of ['4', '-1', '1.5', 'x', '', '12']) {
      expect(pick(`language=Rust&level=${level}`), level).toEqual({ language: 'Rust', level: null });
    }
  });

  it('builds the query back, and round-trips through it', () => {
    expect(learnGoalQuery({ language: 'TypeScript', level: 1 })).toBe('language=TypeScript&level=1');
    expect(learnGoalQuery({ language: 'Go', level: null })).toBe('language=Go');
    for (const goal of [
      { language: 'Ruby', level: 0 },
      { language: 'JavaScript', level: null },
    ] as const) {
      expect(pick(learnGoalQuery(goal))).toEqual(goal);
    }
    expect(withLearnGoal('/learn/start/issues' as never, { language: 'Python', level: 2 })).toBe(
      '/learn/start/issues?language=Python&level=2',
    );
    expect(withLearnGoal('/learn/start' as never, null)).toBe('/learn/start');
  });

  it('pre-sets Your goal from a saved language goal only', () => {
    expect(learnGoalPickOfProfile(filledProfile)).toEqual({ language: 'TypeScript', level: 1 });
    expect(learnGoalPickOfProfile({ ...filledProfile, goalValue: 'typescript', levels: [] })).toEqual({
      language: 'TypeScript',
      level: null,
    });
    expect(learnGoalPickOfProfile(emptyProfile)).toBeNull();
    expect(learnGoalPickOfProfile(null)).toBeNull();
    expect(learnGoalPickOfProfile({ ...filledProfile, goalKind: 'PROJECT', goalValue: 'vercel/next.js' })).toBeNull();
    expect(learnGoalPickOfProfile({ ...filledProfile, goalValue: 'Haskell' })).toBeNull();
  });

  it('names the goal for its chips: the language and its level', () => {
    expect(goalViewOfPick({ language: 'Go', level: 1 })).toEqual({ kind: 'language', value: 'Go', level: 'Some' });
    expect(goalViewOfPick({ language: 'Go', level: null })).toEqual({ kind: 'language', value: 'Go', level: null });
  });
});

describe("Pick an issue's rows", () => {
  it("lead to the issue's own start address: with the goal for a visitor, without it signed in, never /my", () => {
    const ref = { repo: 'driftwood-js/driftwood', issue: 934 };
    const visitor = learnStartHrefOf(ref, issueStepTargetOf({ language: 'TypeScript', level: 1 }));
    const signedIn = learnStartHrefOf(ref, issueStepTargetOf(null));
    expect(visitor).toBe('/learn/start/driftwood-js/driftwood/934?language=TypeScript&level=1');
    expect(signedIn).toBe('/learn/start/driftwood-js/driftwood/934');
  });

  it("take a visitor's day list as Learn's list: keyed by the issue's address, the whole list, nothing to note", () => {
    const items = ISSUES.slice(0, 2).map(({ issueId: _id, ...issue }) => issue);
    const goal = goalViewOfPick({ language: 'TypeScript', level: 1 });
    const list = learnIssuesOfPublic({ language: 'TypeScript', items, total: 40 }, goal);
    expect(list.items.map(({ issueId }) => issueId)).toEqual(['driftwood-js/driftwood#934', 'tidewave/tide#958']);
    expect(list).toMatchObject({ goal, total: 2, empty: null, capReached: false, room: null });
  });
});
