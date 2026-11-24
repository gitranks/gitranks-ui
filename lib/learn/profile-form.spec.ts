import { describe, expect, it } from 'vitest';

import { emptyProfile, filledProfile } from './__fixtures__/profile';
import { learnGoalLabelOf } from './profile-form';

describe('a Learn goal', () => {
  it('names the saved goal and, for a language, its level; nothing without a goal', () => {
    expect(learnGoalLabelOf(filledProfile)).toBe('TypeScript, Some');
    expect(learnGoalLabelOf({ ...filledProfile, goalKind: 'PROJECT', goalValue: 'vercel/next.js' })).toBe(
      'vercel/next.js',
    );
    expect(learnGoalLabelOf(emptyProfile)).toBeNull();
    expect(learnGoalLabelOf(null)).toBeNull();
  });
});
