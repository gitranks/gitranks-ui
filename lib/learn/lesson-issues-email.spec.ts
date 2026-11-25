import { describe, expect, it } from 'vitest';

import { listNone } from './__fixtures__/issues';
import {
  LESSON_ISSUES_EMAIL_LABEL,
  LESSON_ISSUES_EMAIL_LINE,
  learnLessonIssuesEmailOf,
  lessonIssuesEmailStateOf,
  listAfterLessonSave,
} from './lesson-issues-email';
import { LESSON_ISSUES_TITLE, learnLessonIssuesSettingOf } from './settings';

const LESSON = 'find-duplicates-with-a-set';

describe('the words of "Email me issues for my lessons"', () => {
  it("names the button, its line and Settings' row in plain words, with no long dash", () => {
    expect(LESSON_ISSUES_EMAIL_LABEL).toBe('Email me issues for my lessons');
    expect(LESSON_ISSUES_EMAIL_LINE).toBe(
      'This lesson and every lesson you learned but have not used on a real issue yet. One email a day at most.',
    );
    expect(LESSON_ISSUES_TITLE).toBe('Issues for my lessons');
    for (const words of [LESSON_ISSUES_EMAIL_LABEL, LESSON_ISSUES_EMAIL_LINE, LESSON_ISSUES_TITLE]) {
      expect(words).not.toMatch(/—|claim/i);
    }
  });
});

describe("lessonIssuesEmailStateOf: what the box shows in the button's place", () => {
  const on = listNone({ lessonIssues: true, lessonIssuesCovered: true });

  it('a visitor: the button, which signs in through the onboarding', () => {
    expect(lessonIssuesEmailStateOf({ signedIn: false, list: null, sign: null })).toEqual({ kind: 'visitor' });
  });

  it("the person's own read not answered yet: the button, waiting", () => {
    expect(lessonIssuesEmailStateOf({ signedIn: true, list: null, sign: true })).toEqual({ kind: 'unread' });
  });

  it('signed in without the Learn sign: the button, which opens the onboarding', () => {
    expect(lessonIssuesEmailStateOf({ signedIn: true, list: listNone(), sign: false })).toEqual({ kind: 'setup' });
  });

  it('with the Learn sign, or a sign that cannot be read: the button that turns it on', () => {
    expect(lessonIssuesEmailStateOf({ signedIn: true, list: listNone(), sign: true })).toEqual({ kind: 'off' });
    // A sign that cannot be read never sends anyone to the onboarding.
    expect(lessonIssuesEmailStateOf({ signedIn: true, list: listNone(), sign: null })).toEqual({ kind: 'off' });
  });

  it('on and covering this lesson: where the email goes', () => {
    expect(lessonIssuesEmailStateOf({ signedIn: true, list: on, sign: true })).toEqual({
      kind: 'on',
      to: 'y***@example.com',
    });
    // Already on before the sign: it says so, never the onboarding.
    expect(lessonIssuesEmailStateOf({ signedIn: true, list: on, sign: false }).kind).toBe('on');
  });

  it('never says "on" for a lesson the email skips, nor while it is not known', () => {
    for (const covered of [false, null]) {
      const list = listNone({ lessonIssues: true, lessonIssuesCovered: covered });
      expect(lessonIssuesEmailStateOf({ signedIn: true, list, sign: true })).toEqual({ kind: 'off' });
    }
    const unknown = listNone({ lessonIssues: null, lessonIssuesCovered: true });
    expect(lessonIssuesEmailStateOf({ signedIn: true, list: unknown, sign: true })).toEqual({ kind: 'off' });
  });

  it('on with no address: says so, and never looks on while it can send nothing', () => {
    const list = listNone({ lessonIssues: true, lessonIssuesCovered: true, emailTo: null });
    expect(lessonIssuesEmailStateOf({ signedIn: true, list, sign: true })).toEqual({ kind: 'no-address' });
  });
});

describe('the answers of the switch', () => {
  it("reads a save's answer, the lessons asked for kept as slugs", () => {
    expect(learnLessonIssuesEmailOf({ lessonIssues: true, lessonIssuesAsked: [LESSON, 3, null] })).toEqual({
      lessonIssues: true,
      lessonIssuesAsked: [LESSON],
    });
    expect(learnLessonIssuesEmailOf({ lessonIssues: false, lessonIssuesAsked: null })).toEqual({
      lessonIssues: false,
      lessonIssuesAsked: [],
    });
    expect(learnLessonIssuesEmailOf({ lessonIssues: 'yes' })).toBeNull();
    expect(learnLessonIssuesEmailOf(null)).toBeNull();
  });

  it("reads Settings' switch, and none when the API leaves it null", () => {
    expect(learnLessonIssuesSettingOf({ lessonIssues: true, lessonIssuesAsked: [] })).toEqual({ on: true });
    expect(learnLessonIssuesSettingOf({ lessonIssues: false })).toEqual({ on: false });
    expect(learnLessonIssuesSettingOf({ lessonIssues: null })).toBeNull();
    expect(learnLessonIssuesSettingOf(null)).toBeNull();
  });

  it("changes the person's list once saved: covered with this lesson asked, as it was otherwise", () => {
    const list = listNone({ lessonIssues: false, lessonIssuesCovered: false });
    expect(listAfterLessonSave(list, { lessonIssues: true, lessonIssuesAsked: [LESSON] }, LESSON)).toMatchObject({
      lessonIssues: true,
      lessonIssuesCovered: true,
    });
    // Turned off: the switch goes off; whether the lesson is covered stays as it was read.
    const off = listAfterLessonSave(
      { ...list, lessonIssuesCovered: true },
      { lessonIssues: false, lessonIssuesAsked: [LESSON] },
      null,
    );
    expect(off).toMatchObject({ lessonIssues: false, lessonIssuesCovered: true });
    // On without this lesson in the answer: not said to cover it.
    expect(listAfterLessonSave(list, { lessonIssues: true, lessonIssuesAsked: [] }, LESSON)).toMatchObject({
      lessonIssues: true,
      lessonIssuesCovered: false,
    });
  });
});
