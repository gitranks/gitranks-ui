import type { Route } from 'next';
import { describe, expect, it } from 'vitest';

import {
  learnSetupPageOf,
  lessonSlugOfBack,
  onboardingLineOf,
  onboardingSaveOf,
  onboardingTicksOf,
} from './onboarding';
import type { SetupValues } from './setup';

const LESSON = '/learn/lessons/hash-maps' as Route;
const guessed: SetupValues = { mainLanguage: 'go', otherLanguages: ['python'], level: 3 };
const nothing: SetupValues = { mainLanguage: null, otherLanguages: [], level: null };

describe("Learn's setup page by the sign", () => {
  it('sends a person with the sign straight back, else gives them the editor', () => {
    expect(learnSetupPageOf({ sign: true, back: LESSON, saved: false })).toEqual({ kind: 'redirect', to: LESSON });
    expect(learnSetupPageOf({ sign: true, back: null, saved: false })).toEqual({ kind: 'editor', back: null });
  });

  it('gives a person without the sign the onboarding, a saved setup or not', () => {
    expect(learnSetupPageOf({ sign: false, back: LESSON, saved: true })).toEqual({ kind: 'onboarding', back: LESSON });
  });

  it('decides by the saved setup when the sign cannot be read, and never sends the person back', () => {
    expect(learnSetupPageOf({ sign: null, back: LESSON, saved: true })).toEqual({ kind: 'editor', back: LESSON });
    expect(learnSetupPageOf({ sign: null, back: LESSON, saved: false })).toEqual({ kind: 'onboarding', back: LESSON });
  });
});

describe("the onboarding's save", () => {
  it('keeps the main language read while it is ticked; the rest are the others, in Learn’s order', () => {
    expect(onboardingSaveOf(['go', 'ruby', 'python'], guessed)).toEqual({
      mainLanguage: 'go',
      otherLanguages: ['python', 'ruby'],
      level: 3,
    });
  });

  it('takes the first ticked in Learn’s order when the main language read is not ticked, or there is none', () => {
    expect(onboardingSaveOf(['ruby', 'javascript'], guessed)).toMatchObject({
      mainLanguage: 'javascript',
      otherLanguages: ['ruby'],
    });
    expect(onboardingSaveOf(['rust', 'php'], nothing)).toMatchObject({ mainLanguage: 'rust', otherLanguages: ['php'] });
  });

  it('sends the level read, else some experience', () => {
    expect(onboardingSaveOf(['go'], guessed)?.level).toBe(3);
    expect(onboardingSaveOf(['go'], nothing)?.level).toBe(2);
    expect(onboardingSaveOf(['go'], { ...guessed, level: 1 })?.level).toBe(1);
  });

  it('is nothing while nothing is ticked', () => {
    expect(onboardingSaveOf([], guessed)).toBeNull();
  });

  it('ticks the languages read to start', () => {
    expect(onboardingTicksOf(guessed)).toEqual(['python', 'go']);
    expect(onboardingTicksOf(nothing)).toEqual([]);
  });
});

describe('the line over the first step', () => {
  it('names the lesson, saying when its answer is kept', () => {
    expect(onboardingLineOf(LESSON, false)).toBe('After this you go back to the lesson.');
    expect(onboardingLineOf(LESSON, true)).toBe('Your answer is kept. After this you go back to the lesson.');
  });

  it('names the issue from an issue page or its start page', () => {
    expect(onboardingLineOf('/my/issues/q7k2m9xa?from=learn&look=1', false)).toBe(
      'After this you go back to the issue.',
    );
    expect(onboardingLineOf('/my/start/octo/app/12?lesson=1', false)).toBe('After this you go back to the issue.');
  });

  it('says nothing for any other way back, or none', () => {
    expect(onboardingLineOf('/learn/courses/go', false)).toBeNull();
    expect(onboardingLineOf('/learn/lessons/hash-maps/real-world', true)).toBeNull();
    expect(onboardingLineOf(null, true)).toBeNull();
  });

  it('reads a lesson’s slug from its address only', () => {
    expect(lessonSlugOfBack('/learn/lessons/hash-maps?x=1')).toBe('hash-maps');
    expect(lessonSlugOfBack('/learn/lessons/hash-maps/real-world')).toBeNull();
    expect(lessonSlugOfBack('/learn/lessons/%E0%A4%A')).toBeNull();
  });
});
