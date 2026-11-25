import { describe, expect, it } from 'vitest';

import {
  LESSON_NOW,
  loopQuestion,
  mineLearned,
  mineLoopInJavaScript,
  mineNew,
  setDepths,
  setDepthsLast,
  setGroup,
  setGroupLast,
  setLesson,
  setQuestion,
} from './__fixtures__/lesson-page';
import {
  bodyPartsOf,
  checkedDateOf,
  deeperOf,
  depthLineOf,
  insightRowsOf,
  isGroupFinished,
  isLastOfGroup,
  lessonPlaceOf,
  mainLabelOf,
  reviewWordsOf,
  sentenceCountOf,
  storedAnswerOf,
  storedLanguageOf,
} from './lesson-page';
import { learnFactPath, learnLessonMarkdownPath, lessonMistakeHref } from './paths';

const slug = setLesson.slug;

describe('a lesson’s place in its group', () => {
  it('says only where it is for a visitor', () => {
    expect(lessonPlaceOf(setGroup, slug, null)).toEqual({ index: 2, count: 9, squares: null, learned: null });
  });

  it('draws a member’s squares by depth, this lesson ringed until it is learned', () => {
    const before = lessonPlaceOf(setGroup, slug, { depths: setDepths, current: 'NONE' });
    expect(before.squares).toEqual(['learned', 'learned', 'current', 'none', 'none', 'none', 'none', 'none', 'none']);
    expect(before.learned).toBe(2);
    const after = lessonPlaceOf(setGroup, slug, { depths: setDepths, current: 'LEARNED' });
    expect(after.squares?.slice(0, 3)).toEqual(['learned', 'learned', 'learned']);
    expect(after.learned).toBe(3);
  });

  it('shows practised and mastered in their own shades, and a paused lesson dashed', () => {
    const group = setGroup.map((entry, index) => (index === 4 ? { ...entry, paused: true } : entry));
    const place = lessonPlaceOf(group, slug, {
      depths: { 'what-a-hash-is': 'PRACTISED', 'how-a-hash-map-finds-a-key': 'MASTERED' },
      current: 'NONE',
    });
    expect(place.squares?.slice(0, 5)).toEqual(['practised', 'mastered', 'current', 'none', 'paused']);
  });

  it('keeps the deeper of the saved depth and the page’s own', () => {
    const place = lessonPlaceOf(setGroup, slug, { depths: { [slug]: 'PRACTISED' }, current: 'LEARNED' });
    expect(place.squares?.[2]).toBe('practised');
    expect(deeperOf('LEARNED', 'MASTERED')).toBe('MASTERED');
    expect(deeperOf('PRACTISED', 'NONE')).toBe('PRACTISED');
  });

  it('knows the last lesson of a group, and a group finished', () => {
    const last = lessonPlaceOf(setGroupLast, slug, { depths: setDepthsLast, current: 'LEARNED' });
    expect(isLastOfGroup(last)).toBe(true);
    expect(isGroupFinished(last)).toBe(true);
    expect(last.learned).toBe(9);
    expect(isGroupFinished(lessonPlaceOf(setGroupLast, slug, { depths: setDepthsLast, current: 'NONE' }))).toBe(false);
    expect(isLastOfGroup(lessonPlaceOf(setGroup, slug, null))).toBe(false);
  });

  it('places a lesson its group does not list first, so the page still draws', () => {
    expect(lessonPlaceOf([], 'gone', { depths: {}, current: 'NONE' })).toEqual({
      index: 0,
      count: 1,
      squares: ['current'],
      learned: 0,
    });
  });
});

describe('the main button once the answer is right', () => {
  const next = { slug: 'count', title: 'Count things with a hash map' };

  it('asks a visitor to sign in, and takes a member on', () => {
    expect(mainLabelOf({ member: false, last: false, next })).toBe('Sign in to keep your progress');
    expect(mainLabelOf({ member: true, last: false, next })).toBe('Next: Count things with a hash map');
  });

  it('sends a signed-in person without the Learn sign to keep their progress, wherever the lesson is', () => {
    expect(mainLabelOf({ member: true, keep: true, last: false, next })).toBe('Keep your progress');
    expect(mainLabelOf({ member: true, keep: true, last: true, next: null })).toBe('Keep your progress');
    expect(mainLabelOf({ member: false, keep: true, last: false, next })).toBe('Sign in to keep your progress');
  });

  it('finishes the group on its last lesson, or where there is no next', () => {
    expect(mainLabelOf({ member: true, last: true, next })).toBe('Finish this group');
    expect(mainLabelOf({ member: true, last: false, next: null })).toBe('Finish this group');
  });
});

describe('the depth line', () => {
  const at = (iso: string) => new Date(iso);

  it('counts the review in calendar days of the person’s time zone', () => {
    expect(reviewWordsOf('2026-10-31T00:00:00.000Z', LESSON_NOW, 'UTC')).toBe('Review in 3 days.');
    expect(reviewWordsOf('2026-10-29T00:00:00.000Z', LESSON_NOW, 'UTC')).toBe('Review tomorrow.');
    expect(reviewWordsOf('2026-10-28T00:00:00.000Z', LESSON_NOW, 'UTC')).toBe('Review today.');
    // Late in the evening in Kyiv it is already the next day there.
    expect(reviewWordsOf('2026-10-30T22:00:00.000Z', at('2026-10-28T22:30:00.000Z'), 'Europe/Kyiv')).toBe(
      'Review in 2 days.',
    );
    expect(reviewWordsOf(null, LESSON_NOW)).toBeNull();
    expect(reviewWordsOf('not a date', LESSON_NOW)).toBeNull();
  });

  it('counts in UTC when the time zone is one it does not know', () => {
    expect(reviewWordsOf('2026-10-31T00:00:00.000Z', LESSON_NOW, 'Mars/Olympus_Mons')).toBe('Review in 3 days.');
    expect(
      depthLineOf({ depth: 'PRACTISED', dueAt: '2026-10-29T00:00:00.000Z', now: LESSON_NOW, timeZone: '' })?.tail,
    ).toBe('Review tomorrow.');
  });

  it('words each depth as the boards do', () => {
    const base = { now: LESSON_NOW, timeZone: 'UTC' };
    expect(depthLineOf({ ...base, depth: 'NONE', dueAt: null })).toBeNull();
    expect(depthLineOf({ ...base, depth: 'LEARNED', dueAt: mineLearned.dueAt })).toEqual({
      dots: 1,
      lead: 'Learned.',
      tail: 'Review in 3 days.',
    });
    expect(depthLineOf({ ...base, depth: 'LEARNED', dueAt: mineLearned.dueAt, groupFinished: true })?.tail).toBe(
      'Group finished.',
    );
    expect(depthLineOf({ ...base, depth: 'PRACTISED', dueAt: '2026-11-07T00:00:00.000Z' })).toEqual({
      dots: 2,
      lead: 'Practised.',
      tail: 'Review in 10 days.',
    });
    expect(depthLineOf({ ...base, depth: 'MASTERED', dueAt: null })).toEqual({
      dots: 3,
      lead: 'Mastered.',
      tail: 'Nothing more to do. This is the top level.',
    });
    expect(depthLineOf({ ...base, depth: 'LEARNED', dueAt: null })?.tail).toBeNull();
  });
});

describe('what to take with you', () => {
  it('shows a row only for what the lesson holds', () => {
    expect(insightRowsOf(setLesson).map((row) => row.id)).toEqual(['say', 'fact', 'deeper']);
    expect(insightRowsOf({ ...setLesson, fact: null, deeper: null }).map((row) => row.id)).toEqual(['say']);
    expect(insightRowsOf({ ...setLesson, deeper: '  ' }).map((row) => row.id)).toEqual(['say', 'fact']);
  });

  it('says what each closed row holds', () => {
    expect(insightRowsOf(setLesson)).toEqual([
      { id: 'say', title: 'Say it in an interview', sub: 'The answer in three sentences' },
      { id: 'fact', title: 'Did you know?', sub: 'How one web request froze a server' },
      { id: 'deeper', title: 'Go deeper', sub: 'A prompt for your own agent' },
    ]);
    expect(insightRowsOf({ ...setLesson, say: 'One idea. Said twice!' })[0].sub).toBe('The answer in two sentences');
  });

  it('counts sentences where they end before a space or the end', () => {
    expect(sentenceCountOf('One. Two? Three!')).toBe(3);
    expect(sentenceCountOf('A set, for example, holds items.')).toBe(1);
    expect(sentenceCountOf('')).toBe(0);
  });
});

describe('where the examples and visuals sit', () => {
  const names = { examples: ['main', 'r2'], visuals: ['growth'] };

  it('places each where the text names it, the text around them kept', () => {
    expect(bodyPartsOf('First.\n\n[[example: main]]\n\nThen.\n\n[[visual: growth]]', names)).toEqual([
      { kind: 'text', markdown: 'First.' },
      { kind: 'example', name: 'main' },
      { kind: 'text', markdown: 'Then.' },
      { kind: 'visual', name: 'growth' },
    ]);
  });

  it('puts the main example after the text when the text places none', () => {
    expect(bodyPartsOf('Only text.', names)).toEqual([
      { kind: 'text', markdown: 'Only text.' },
      { kind: 'example', name: 'main' },
    ]);
    // A lesson with no main example: its question's code is not the lesson's example.
    expect(bodyPartsOf('Only text.', { examples: ['q1'], visuals: [] })).toEqual([
      { kind: 'text', markdown: 'Only text.' },
    ]);
    expect(bodyPartsOf('Only text.', { examples: [], visuals: [] })).toEqual([
      { kind: 'text', markdown: 'Only text.' },
    ]);
  });

  it('skips a name the lesson does not have, places a name once, and reads a line only on its own', () => {
    expect(
      bodyPartsOf('[[example: r2]]\n[[visual: missing]]\n[[example: r2]]\nSee [[example: main]] here.', names),
    ).toEqual([
      { kind: 'example', name: 'r2' },
      { kind: 'text', markdown: 'See [[example: main]] here.' },
    ]);
  });

  it('leaves a placement line inside fenced code as code', () => {
    const body = ['Write it like this:', '', '```', '[[example: main]]', '```', '', 'Then.', '', '[[visual: growth]]'];
    expect(bodyPartsOf(body.join('\n'), names)).toEqual([
      { kind: 'text', markdown: 'Write it like this:\n\n```\n[[example: main]]\n```\n\nThen.' },
      { kind: 'visual', name: 'growth' },
      { kind: 'example', name: 'main' },
    ]);
    // A tilde fence closes only on tildes, at least as many; a backtick line inside it is code too.
    const tildes = ['~~~~ text', '```', '[[example: r2]]', '~~~', '~~~~', '[[example: r2]]'];
    expect(bodyPartsOf(tildes.join('\n'), names)).toEqual([
      { kind: 'text', markdown: '~~~~ text\n```\n[[example: r2]]\n~~~\n~~~~' },
      { kind: 'example', name: 'r2' },
    ]);
    // Inline code with three backticks on a line of its own words opens no fence.
    expect(bodyPartsOf('```a``` b\n[[example: r2]]', names)).toEqual([
      { kind: 'text', markdown: '```a``` b' },
      { kind: 'example', name: 'r2' },
    ]);
  });
});

describe('a lesson opened again', () => {
  it('shows the right answer given before, done', () => {
    const state = storedAnswerOf(setQuestion, mineLearned, null);
    expect(state).toMatchObject({ phase: 'done', picked: 1, tries: 1 });
    expect(state?.shown).toEqual({
      right: true,
      why: 'It goes through the list once and checks the set once per number.',
    });
  });

  it('asks again when nothing is stored, or the stored pick is no longer right', () => {
    expect(storedAnswerOf(setQuestion, null, null)).toBeNull();
    expect(storedAnswerOf(setQuestion, mineNew, null)).toBeNull();
    expect(storedAnswerOf(setQuestion, { ...mineLearned, picked: 0 }, null)).toBeNull();
    expect(storedAnswerOf(setQuestion, { ...mineLearned, picked: 'myth' }, null)).toBeNull();
  });

  it('grades a stored pick in the language it was given in, not the page’s', () => {
    // Line 4 is the inner loop in JavaScript, not in Python.
    expect(storedAnswerOf(loopQuestion, mineLoopInJavaScript, 'python')).toMatchObject({
      phase: 'done',
      picked: 4,
      tries: 2,
    });
    expect(storedLanguageOf(loopQuestion, mineLoopInJavaScript, 'python')).toBe('javascript');
    // Not kept: the page's language as the question has it.
    expect(storedAnswerOf(loopQuestion, { ...mineLoopInJavaScript, language: null }, 'python')).toBeNull();
    expect(storedAnswerOf(loopQuestion, { ...mineLoopInJavaScript, language: null }, 'javascript')).not.toBeNull();
    expect(storedLanguageOf(loopQuestion, { language: null }, 'go')).toBe('python');
    // A language the question no longer has: the page's.
    expect(storedLanguageOf(loopQuestion, { language: 'ruby' }, 'javascript')).toBe('javascript');
  });
});

describe('the footer', () => {
  it('dates the last check, and builds its links', () => {
    expect(checkedDateOf('2026-11-12T09:00:00.000Z')).toBe('12 Nov 2026');
    expect(checkedDateOf('nope')).toBeNull();
    expect(learnLessonMarkdownPath(slug)).toBe('/learn/lessons/find-duplicates-with-a-set.md');
    expect(learnFactPath(slug)).toBe('/learn/lessons/find-duplicates-with-a-set?fact');
    expect(lessonMistakeHref('A + B')).toBe(
      'mailto:hello@gitranks.com?subject=A%20mistake%20in%20the%20lesson%20%22A%20%2B%20B%22',
    );
  });
});
