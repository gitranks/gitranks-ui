import { describe, expect, it } from 'vitest';

import {
  FIX_PR,
  learnFix,
  learnFixClosed,
  learnFixHeld,
  learnFixNoLesson,
  marksDone,
  marksFixer,
  marksHalfWay,
} from './__fixtures__/fix-page';
import { issueRows } from './__fixtures__/issues';
import {
  fixKeyOf,
  fixLearnBlockOf,
  fixMarkdownOf,
  fixMarksOf,
  hasLearnView,
  learnFixOf,
  lessonCardOf,
  mainActionOf,
  similarBecauseOf,
  walkthroughCardOf,
} from './fix-page';

const LONG_DASH = '—';

describe('learnFixOf', () => {
  it('takes the public read as the page uses it', () => {
    expect(learnFixOf(learnFix)).toEqual(learnFix);
    // A zero is never shown: no questions, no passes.
    expect(learnFixOf({ ...learnFix, questions: 0, passes: 0 })).toMatchObject({ questions: null, passes: null });
  });

  it('answers null for none, or a read of another shape', () => {
    expect(learnFixOf(null)).toBeNull();
    expect(learnFixOf({ ...learnFix, made: 'OTHER' })).toBeNull();
    expect(learnFixOf({ ...learnFix, state: 'DRAFT' })).toBeNull();
    expect(learnFixOf({ ...learnFix, fixer: '' })).toBeNull();
  });

  it('has a "Learn from it" view only for a Learn fix not closed without a merge', () => {
    expect(hasLearnView(learnFix)).toBe(true);
    expect(hasLearnView({ ...learnFix, state: 'OPEN' })).toBe(true);
    expect(hasLearnView(learnFixClosed)).toBe(false);
    expect(hasLearnView({ ...learnFix, made: 'CONTRIBUTE' })).toBe(false);
    expect(hasLearnView(null)).toBe(false);
  });
});

describe('fixMarksOf', () => {
  it('takes the marks and up to three similar issues, each with why it is there', () => {
    const read = {
      fixer: false,
      walkthroughHeld: true,
      answered: 2,
      passedAt: null,
      lesson: 'MASTERED',
      lessonAt: '2026-11-28T10:00:00.000Z',
      similar: [
        { issue: issueRows[0], because: 'SAME_LESSON' },
        { issue: issueRows[1], because: 'SOMETHING_NEW' },
        { issue: { issue: null }, because: 'SAME_PROJECT' },
        { issue: issueRows[2], because: 'SAME_PROJECT' },
        { issue: issueRows[3], because: 'SAME_LANGUAGE' },
        { issue: issueRows[4], because: 'SAME_LANGUAGE' },
      ],
    };
    const marks = fixMarksOf(read);
    // Held is the fixer's alone.
    expect(marks).toMatchObject({ fixer: false, held: false, answered: 2, lesson: 'MASTERED' });
    expect(marks?.similar.map((each) => each.because)).toEqual(['SAME_LESSON', 'SAME_PROJECT', 'SAME_LANGUAGE']);
    expect(fixMarksOf({ ...read, fixer: true })?.held).toBe(true);
  });

  it('answers null signed out, or for a read of another shape', () => {
    expect(fixMarksOf(null)).toBeNull();
    expect(fixMarksOf({ similar: [] })).toBeNull();
  });
});

describe('the cards', () => {
  it('offers a visitor the walkthrough and the lesson, the walkthrough first', () => {
    const walkthrough = walkthroughCardOf(FIX_PR, learnFix, null);
    const lesson = lessonCardOf(learnFix, null);
    expect(walkthrough).toMatchObject({
      title: '4 questions about this change',
      text: 'What went wrong and how the fix works. mira-dev answered them before the pull request opened.',
      link: {
        text: 'See mira-dev’s answers',
        href: '/learn/fixes/driftwood-js/driftwood/1419/walkthrough/by/mira-dev',
      },
      button: { text: 'Start the walkthrough', href: '/learn/fixes/driftwood-js/driftwood/1419/walkthrough' },
      mark: null,
    });
    expect(lesson).toMatchObject({
      title: 'Normalize a key before you look it up',
      course: { name: 'Algorithms and data structures', href: '/learn/courses/algorithms' },
      link: { text: 'All fixes that used it' },
      button: { text: 'Learn the lesson', href: '/learn/lessons/normalize-before-lookup' },
      mark: null,
    });
    expect(mainActionOf([walkthrough, lesson], null)).toBe('walkthrough');
  });

  it('fills the marks and moves the main action: walkthrough, then lesson, then the first similar issue', () => {
    const half = walkthroughCardOf(FIX_PR, learnFix, marksHalfWay);
    expect(half).toMatchObject({
      mark: { text: '2 of 4 answered', tone: 'muted' },
      button: { text: 'Continue the walkthrough' },
    });
    const passed = { ...marksHalfWay, passedAt: '2026-12-03T10:00:00.000Z' };
    const cards = [walkthroughCardOf(FIX_PR, learnFix, passed), lessonCardOf(learnFix, passed)];
    expect(cards[0]).toMatchObject({
      mark: { text: 'Passed 3 Dec', tone: 'positive' },
      button: { text: 'Open it again' },
    });
    expect(mainActionOf(cards, passed)).toBe('lesson');
    const done = [walkthroughCardOf(FIX_PR, learnFix, marksDone), lessonCardOf(learnFix, marksDone)];
    expect(done[1]).toMatchObject({ mark: { text: 'Learned 28 Nov' }, button: { text: 'Open the lesson' } });
    expect(mainActionOf(done, marksDone)).toBe('similar');
    expect(mainActionOf(done, { ...marksDone, similar: [] })).toBeNull();
  });

  it('keeps a lesson marked as known on offer, never shown as learned', () => {
    const known = lessonCardOf(learnFix, { ...marksDone, lesson: 'MARKED_AS_KNOWN' });
    expect(known).toMatchObject({ mark: { text: 'Marked as known', tone: 'muted' }, done: false });
    expect(lessonCardOf(learnFix, { ...marksDone, lesson: 'MASTERED' })?.mark?.text).toBe('Mastered');
  });

  it('shows the fixer their own answers, and a walkthrough they passed', () => {
    expect(walkthroughCardOf(FIX_PR, learnFix, marksFixer)).toMatchObject({
      text: 'What went wrong and how the fix works. You answered them before the pull request opened.',
      link: { text: 'See your answers' },
      button: { text: 'Open it again' },
      done: true,
    });
  });

  it('leaves out a card with nothing behind it: no lesson, a held walkthrough, answers kept private', () => {
    expect(lessonCardOf(learnFixNoLesson, null)).toBeNull();
    expect(walkthroughCardOf(FIX_PR, learnFixHeld, null)).toBeNull();
    expect(walkthroughCardOf(FIX_PR, { ...learnFix, answersShared: false }, null)?.link).toBeNull();
  });

  it('says why a similar issue is there', () => {
    const [first] = issueRows;
    expect(similarBecauseOf({ row: first, because: 'SAME_LESSON' })).toBe('Uses the same lesson.');
    expect(similarBecauseOf({ row: first, because: 'SAME_PROJECT' })).toBe('In the same project.');
    expect(similarBecauseOf({ row: first, because: 'SAME_LANGUAGE' })).toBe(`Also in ${first.issue.language}.`);
  });
});

describe('the Learn part of "How it was made"', () => {
  it('says what the fixer answered, where to read it, and the lesson behind it', () => {
    expect(fixLearnBlockOf(FIX_PR, learnFix)).toEqual({
      title: 'mira-dev answered 4 questions about this change before sending it',
      text: 'In GitRanks Learn the agent that writes a fix also has to teach it. The questions are about this change only, and the pull request cannot be sent until the person answers them.',
      answers: {
        text: 'See the questions and mira-dev’s answers',
        href: '/learn/fixes/driftwood-js/driftwood/1419/walkthrough/by/mira-dev',
      },
      yourself: { text: 'Answer them yourself', href: '/learn/fixes/driftwood-js/driftwood/1419/walkthrough' },
      lesson: { title: 'Normalize a key before you look it up', href: '/learn/lessons/normalize-before-lookup' },
    });
  });

  it('asks no one to answer a fix closed without a merge, and is left out with nothing to show', () => {
    expect(fixLearnBlockOf(FIX_PR, learnFixClosed)?.yourself).toBeNull();
    expect(fixLearnBlockOf(FIX_PR, { ...learnFixHeld, lesson: null })).toBeNull();
    expect(fixLearnBlockOf(FIX_PR, { ...learnFix, made: 'CONTRIBUTE' })).toBeNull();
    expect(fixLearnBlockOf(FIX_PR, null)).toBeNull();
    // A held walkthrough: the lesson alone, with no word that something is missing.
    expect(fixLearnBlockOf(FIX_PR, learnFixHeld)).toMatchObject({ title: null, answers: null, yourself: null });
  });
});

describe('the Markdown part and the sitemap key', () => {
  const absolute = (path: string) => `https://gitranks.com${path}`;

  it('lists the views, the walkthrough and the lesson, with absolute links and no long dash', () => {
    const lines = fixMarkdownOf(FIX_PR, learnFix, absolute);
    expect(lines[0]).toBe('## Learn from it');
    expect(lines.join('\n')).toContain('(https://gitranks.com/learn/fixes/driftwood-js/driftwood/1419)');
    expect(lines.join('\n')).toContain('(part of Algorithms and data structures)');
    expect(lines.join('\n')).not.toContain(LONG_DASH);
    expect(fixMarkdownOf(FIX_PR, learnFixClosed, absolute).join('\n')).not.toContain('[Learn from it]');
    expect(fixMarkdownOf(FIX_PR, { ...learnFix, made: 'CONTRIBUTE' }, absolute)).toEqual([]);
  });

  it('keys a pull request in lower case', () => {
    expect(fixKeyOf({ nameWithOwner: 'Driftwood-JS/Driftwood', number: 1419 })).toBe('driftwood-js/driftwood#1419');
  });
});
