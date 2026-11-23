import { describe, expect, it } from 'vitest';

import { checkResult, checkResultAll, checkResultNone, knownSinceMine } from './__fixtures__/check';
import { algorithmsCourse, algorithmsCoursePaused, lessonAt } from './__fixtures__/course';
import {
  checkAnswerInputOf,
  checkIntroOf,
  checkTitleOf,
  checkVisitorTextOf,
  groupBoxOf,
  groupWordsOf,
  handWordsOf,
  KNOWN_MAX,
  type KnownGroup,
  knownCountsOf,
  knownGroupsOfCourse,
  knownGroupsOfResult,
  knownSaveInputOf,
  knownSlugsOf,
  knownTitleOf,
  outcomePillOf,
  startOf,
  startWordsOf,
  tickedFirstOf,
  toggledGroupOf,
  toggledLessonOf,
} from './check';

const result = knownGroupsOfResult(checkResult);
const hashMaps = result[2];
const lesson = (slug: string, learned = false, proposed = false) => ({ slug, title: slug, learned, proposed });
const group = (lessons: KnownGroup['lessons']): KnownGroup => ({ slug: 'g', title: 'G', outcome: null, lessons });

describe('the sheet of what the person knows', () => {
  it('opens the result with every right group ticked, and never a learned lesson', () => {
    const ticked = tickedFirstOf(result);
    expect(ticked.size).toBe(8 + 12 + 9 + 10);
    const withLearned = [group([lesson('a', true, true), lesson('b', false, true)])];
    expect([...tickedFirstOf(withLearned)]).toEqual(['b']);
  });

  it('reads the course and the person’s marks as a sheet, learned shown, a paused lesson left out', () => {
    const groups = knownGroupsOfCourse(algorithmsCourse, knownSinceMine);
    expect(groups).toHaveLength(9);
    expect(groups[2].lessons.slice(0, 4).map((l) => [l.learned, l.proposed])).toEqual([
      [true, false],
      [true, false],
      [true, false],
      [false, true],
    ]);
    expect(knownCountsOf(groups, tickedFirstOf(groups))).toEqual({ known: 26, total: 86, learned: 3 });
    const paused = knownGroupsOfCourse(algorithmsCoursePaused, { lessons: [] });
    expect(paused[2].lessons.map((l) => l.slug)).not.toContain('find-duplicates-with-a-set');
    expect(knownCountsOf(paused, new Set()).total).toBe(85);
  });

  it('boxes a group on, partly on, off, or none to mark', () => {
    const g = group([lesson('a'), lesson('b'), lesson('c', true)]);
    expect(groupBoxOf(g, new Set(['a', 'b']))).toBe('on');
    expect(groupBoxOf(g, new Set(['a']))).toBe('mixed');
    expect(groupBoxOf(g, new Set())).toBe('off');
    expect(groupBoxOf(group([lesson('c', true)]), new Set())).toBe('learned');
  });

  it('counts a group in words, with no zero', () => {
    expect(groupWordsOf(hashMaps, tickedFirstOf(result))).toBe('all 9 lessons marked as known');
    expect(groupWordsOf(hashMaps, new Set(['a-hash-map-stores-values-by-key']))).toBe('1 of 9 marked as known');
    expect(groupWordsOf(hashMaps, new Set())).toBe('9 lessons');
    const mixed = group([lesson('a', true), lesson('b'), lesson('c')]);
    expect(groupWordsOf(mixed, new Set(['b', 'c']))).toBe('2 of 3 marked as known · 1 learned');
    expect(groupWordsOf(mixed, new Set())).toBe('3 lessons · 1 learned');
    expect(groupWordsOf(group([lesson('a', true), lesson('b', true)]), new Set())).toBe('all 2 lessons learned');
    expect(groupWordsOf(group([lesson('a', true)]), new Set())).toBe('its one lesson learned');
    expect(groupWordsOf(group([lesson('a')]), new Set(['a']))).toBe('its one lesson marked as known');
    expect(groupWordsOf(group([lesson('a')]), new Set())).toBe('1 lesson');
  });

  it('ticks a group whole unless all is ticked, and never touches a learned lesson', () => {
    const g = group([lesson('a'), lesson('b'), lesson('c', true)]);
    expect([...toggledGroupOf(g, new Set(['a']))].sort()).toEqual(['a', 'b']);
    expect([...toggledGroupOf(g, new Set(['a', 'b', 'x']))]).toEqual(['x']);
    expect([...toggledLessonOf(lesson('a'), new Set())]).toEqual(['a']);
    expect([...toggledLessonOf(lesson('a'), new Set(['a']))]).toEqual([]);
    expect([...toggledLessonOf(lesson('c', true), new Set())]).toEqual([]);
  });

  it('saves the ticked lessons in course order, never a learned one', () => {
    const groups = [group([lesson('b'), lesson('a'), lesson('c', true)])];
    expect(knownSlugsOf(groups, new Set(['a', 'b', 'c']))).toEqual(['b', 'a']);
  });

  it('starts the person at the first lesson neither learned nor ticked, or nowhere', () => {
    const stacks = lessonAt('4-1');
    expect(startOf(result, tickedFirstOf(result))).toEqual({ slug: stacks.slug, title: stacks.title });
    const first = lessonAt('1-1');
    expect(startOf(result, new Set())).toEqual({ slug: first.slug, title: first.title });
    const all = knownGroupsOfResult(checkResultAll);
    expect(startOf(all, tickedFirstOf(all))).toBeNull();
    expect(startOf([group([lesson('a', true), lesson('b')])], new Set())).toEqual({ slug: 'b', title: 'b' });
  });
});

const TREES = lessonAt('6-1').slug;

describe('the result’s words', () => {
  it('titles the result from the answers alone, whatever is ticked', () => {
    expect(checkTitleOf(result)).toBe('You already know 4 of the 9 groups');
    expect(checkTitleOf(knownGroupsOfResult(checkResultNone))).toBe('We found nothing you already know');
    expect(checkTitleOf(knownGroupsOfResult(checkResultAll))).toBe('You already know all 9 groups');
    expect(checkTitleOf([{ outcome: 'RIGHT' }])).toBe('You already know its one group');
    expect(checkIntroOf(result)).toMatch(/^This is our guess from your answers/);
    expect(checkIntroOf(knownGroupsOfResult(checkResultNone))).toMatch(/^That is fine: the course starts/);
  });

  it('says how each question went', () => {
    expect(outcomePillOf('RIGHT')).toEqual({ text: 'You answered right', right: true });
    expect(outcomePillOf('WRONG')).toEqual({ text: 'You answered wrong', right: false });
    expect(outcomePillOf('DONT_KNOW')).toEqual({ text: 'You said “I don’t know”', right: false });
    expect(outcomePillOf('NOT_ANSWERED')).toEqual({ text: 'Not answered', right: false });
    expect(outcomePillOf(null)).toBeNull();
  });

  it('titles the card by how many are marked, with no zero', () => {
    expect(knownTitleOf({ known: 37, total: 86 })).toBe('37 of 86 lessons marked as known');
    expect(knownTitleOf({ known: 0, total: 86 })).toBe('Nothing is marked as known');
    expect(knownTitleOf({ known: 86, total: 86 })).toBe('All 86 lessons marked as known');
    expect(knownTitleOf({ known: 1, total: 1 })).toBe('Its one lesson marked as known');
  });

  it('says where the person starts: the first lesson of the course, or the first they do not know', () => {
    const start = { slug: 's', title: 'Stacks' };
    expect(startWordsOf(start, { known: 0, learned: 0 })).toEqual({
      before: 'You start at ',
      name: 'Stacks',
      after: ', the first lesson of the course.',
    });
    expect(startWordsOf(start, { known: 3, learned: 0 })!.after).toBe(', the first lesson you do not know yet.');
    expect(startWordsOf(start, { known: 0, learned: 2 })!.after).toBe(', the first lesson you do not know yet.');
    expect(startWordsOf(null, { known: 86, learned: 0 })).toBeNull();
  });

  it('says what the person changed on our guess, and nothing when they changed nothing', () => {
    const ticked = tickedFirstOf(result);
    expect(handWordsOf(result, ticked)).toBeNull();
    const less = new Set(ticked);
    less.delete('what-happens-when-two-keys-collide');
    less.delete('when-a-hash-map-is-the-wrong-choice');
    expect(handWordsOf(result, less)).toBe('You unticked 2 lessons yourself.');
    expect(handWordsOf(result, new Set([...ticked, TREES]))).toBe('You ticked 1 lesson yourself.');
    expect(handWordsOf(result, new Set([...less, TREES]))).toBe('You ticked 1 lesson and unticked 2 yourself.');
  });

  it('tells a visitor what the check does, with the course’s groups', () => {
    expect(checkVisitorTextOf(algorithmsCourse)).toBe(
      'It asks one question for each of the 9 groups in Algorithms and data structures, then marks what you already know, so you start further in. Without an account there is nowhere to keep the result.',
    );
    expect(checkVisitorTextOf({ name: 'Go', groups: [{}] })).toContain('one question for its one group in Go');
  });
});

describe('what the page sends', () => {
  const answer = { course: 'algorithms', group: 'big-o', picked: 1, dontKnow: false, language: 'python' };

  it('takes a check answer: a pick, or "I don’t know" alone', () => {
    expect(checkAnswerInputOf(answer)).toEqual(answer);
    expect(checkAnswerInputOf({ ...answer, picked: null, dontKnow: true, language: null })).toEqual({
      ...answer,
      picked: null,
      dontKnow: true,
      language: null,
    });
    for (const bad of [
      { ...answer, course: '../x' },
      { ...answer, group: '' },
      { ...answer, group: 7 },
      { ...answer, dontKnow: 'yes' },
      { ...answer, dontKnow: true },
      { ...answer, picked: { at: 1 } },
      { ...answer, language: 'Python 3!' },
    ]) {
      expect(checkAnswerInputOf(bad), JSON.stringify(bad)).toBeNull();
    }
    expect(checkAnswerInputOf(null as never)).toBeNull();
  });

  it('takes marks: a course, its lessons each once, and the run when it saves a result', () => {
    const marks = { course: 'algorithms', known: ['big-o-1', 'stacks'], check: 'run-1' };
    expect(knownSaveInputOf(marks)).toEqual(marks);
    expect(knownSaveInputOf({ course: 'algorithms', known: [] })).toEqual({
      course: 'algorithms',
      known: [],
      check: null,
    });
    for (const bad of [
      { ...marks, course: 'A B' },
      { ...marks, known: 'big-o' },
      { ...marks, known: ['big-o', 'big-o'] },
      { ...marks, known: ['Big O'] },
      { ...marks, known: Array.from({ length: KNOWN_MAX + 1 }, (_, at) => `l-${at}`) },
      { ...marks, check: 'has space' },
      { ...marks, check: 3 },
    ]) {
      expect(knownSaveInputOf(bad), JSON.stringify(bad).slice(0, 80)).toBeNull();
    }
  });
});
