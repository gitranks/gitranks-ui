import { describe, expect, it } from 'vitest';

import {
  algorithmsCourse,
  algorithmsCoursePaused,
  checkSavedMine,
  checkUnfinishedMine,
  courseCards,
  coursesMine,
  coursesMineAllLearned,
  coursesMineChecked,
  doneMine,
  freshMine,
  goCourse,
  groupDoneMine,
  knownLaterMine,
  lessonAt,
  lessonList,
  progressMine,
} from './__fixtures__/course';
import {
  courseBarLabelOf,
  courseBarOf,
  courseBoxesOf,
  courseCardStandingOf,
  courseCountLineOf,
  coursePageKeyOf,
  courseProgressLineOf,
  courseSearchOf,
  courseSectionsOf,
  courseSquareOf,
  coursesSearchOf,
  filterCountsOf,
  foundWordsOf,
  goodShareOf,
  groupHeadOf,
  groupSquaresCountOf,
  groupStandingOf,
  learnersOf,
  learnersWords,
  markedTextOf,
  mineBySlugOf,
  passesFilter,
  reviewMinutesWords,
  searchQueryOf,
  squareHintOf,
  squareLabelOf,
  wordStartMatchOf,
} from './course';
import { courseMarkdownPath, coursesSearchPath, LEARN_COURSES_MARKDOWN_PATH } from './paths';

const LONG_DASH = String.fromCodePoint(0x2014);

const text = (parts: { count: number | null; words: string }[]) =>
  parts.map((part) => `${part.count === null ? '' : part.count.toLocaleString('en-US')}${part.words}`).join(' · ');

describe("a course's public numbers", () => {
  it('shows learners from 10, worded "N learners"', () => {
    expect(learnersOf({ learners: 9, goodShare: null })).toBeNull();
    expect(learnersOf({ learners: 0, goodShare: null })).toBeNull();
    expect(learnersOf({ learners: null, goodShare: null })).toBeNull();
    expect(learnersOf({ learners: 10, goodShare: null })).toBe(10);
    expect(learnersOf({ learners: 1240, goodShare: null })).toBe(1240);
    expect(learnersWords(1240)).toBe('1,240 learners');
  });

  it('shows the share who rate it good only when the API gives one', () => {
    expect(goodShareOf({ learners: null, goodShare: null })).toBeNull();
    expect(goodShareOf({ learners: null, goodShare: 94 })).toBe(94);
    expect(goodShareOf({ learners: null, goodShare: 101 })).toBeNull();
  });

  it("counts a course's lessons and groups", () => {
    expect(courseCountLineOf(algorithmsCourse)).toBe('86 lessons in 9 groups. Each one takes about two minutes.');
    expect(courseCountLineOf(goCourse)).toBe('104 lessons in 1 group. Each one takes about two minutes.');
  });
});

describe("a lesson's square", () => {
  const own = mineBySlugOf(progressMine);
  const squareAt = (at: string, mine = own, next: string | null = progressMine.next?.slug ?? null) =>
    courseSquareOf(lessonAt(at), mine.get(lessonAt(at).slug), next);

  it('says the depth, due only once learned; the next one; marked as known; not started', () => {
    expect(squareAt('1-1')).toEqual({ kind: 'mastered', due: false });
    expect(squareAt('1-2')).toEqual({ kind: 'practised', due: false });
    expect(squareAt('1-3')).toEqual({ kind: 'learned', due: true });
    expect(squareAt('3-4')).toEqual({ kind: 'next', due: false });
    expect(squareAt('9-1')).toEqual({ kind: 'none', due: false });
    const saved = mineBySlugOf(checkSavedMine);
    expect(squareAt('1-1', saved, checkSavedMine.next?.slug ?? null)).toEqual({ kind: 'known', due: false });
  });

  it('is paused first, whatever the learner did', () => {
    const paused = algorithmsCoursePaused.groups[2].lessons.find((lesson) => lesson.paused)!;
    expect(courseSquareOf(paused, { slug: paused.slug, depth: 'LEARNED', known: false, due: true }, null)).toEqual({
      kind: 'paused',
      due: false,
    });
  });

  it('labels and hints in plain words', () => {
    expect(squareLabelOf('Big-O', { kind: 'learned', due: true })).toBe('Big-O · Learned · due now');
    expect(squareLabelOf('Big-O', { kind: 'known', due: false })).toBe('Big-O · marked as known');
    expect(squareHintOf({ kind: 'next', due: false })).toBe('Click to start the lesson');
    expect(squareHintOf({ kind: 'known', due: false })).toBe('Click to learn the lesson');
    expect(squareHintOf({ kind: 'mastered', due: false })).toBe('Click to open the lesson');
    expect(squareHintOf({ kind: 'paused', due: false })).toBeNull();
  });
});

describe("a group's count and the line under the title", () => {
  it('counts a group as "4 of 8 learned", with what is marked as known, never a zero', () => {
    const [bigO, , hashMaps] = algorithmsCourse.groups;
    expect(text(groupHeadOf(groupStandingOf(bigO, mineBySlugOf(progressMine))))).toBe('4 of 8 learned');
    expect(text(groupHeadOf(groupStandingOf(bigO, mineBySlugOf(freshMine))))).toBe('8 lessons');
    expect(text(groupHeadOf(groupStandingOf(hashMaps, mineBySlugOf(checkSavedMine))))).toBe(
      '9 lessons · 7 marked as known',
    );
    expect(groupStandingOf(hashMaps, mineBySlugOf(groupDoneMine)).done).toBe(true);
    expect(text([groupSquaresCountOf(groupStandingOf(bigO, mineBySlugOf(progressMine)))])).toBe('4 of 8');
  });

  it("writes the learner's figures, each only when above zero, and the door to the check", () => {
    expect(courseProgressLineOf(freshMine, algorithmsCourse)).toBeNull();
    const progress = courseProgressLineOf(progressMine, algorithmsCourse)!;
    expect(text(progress.parts)).toBe('10 of 86 learned · 4 practised · 1 mastered');
    expect(progress.check).toBe('Mark lessons you already know');
    // Every lesson learned: nothing is left to mark as known.
    expect(courseProgressLineOf(doneMine, algorithmsCourse)!.check).toBeNull();
    const saved = courseProgressLineOf(checkSavedMine, algorithmsCourse)!;
    expect(saved.parts).toEqual([]);
    expect(saved.check).toBe('37 marked as known');
    const later = courseProgressLineOf(knownLaterMine, algorithmsCourse)!;
    expect(text(later.parts)).toBe('2 of 86 learned');
    expect(later.check).toBe('36 marked as known');
  });
});

describe('the three boxes', () => {
  it('for a visitor: the first lesson, the check behind signing in, signing in highlighted', () => {
    const boxes = courseBoxesOf(algorithmsCourse, null);
    expect(boxes.first).toMatchObject({ kind: 'start', lesson: { slug: lessonAt('1-1').slug } });
    expect(boxes.middle).toEqual({ kind: 'check-sign-in' });
    expect(boxes.last).toEqual({ kind: 'sign-in' });
    expect(boxes.highlight).toBe('last');
    expect(courseBoxesOf({ ...algorithmsCourse, checkOffered: false }, null).middle).toEqual({ kind: 'grows' });
  });

  it('for a new learner: the first lesson highlighted, the check offered; the check first when asked', () => {
    const boxes = courseBoxesOf(algorithmsCourse, freshMine);
    expect(boxes.first).toMatchObject({ kind: 'next', why: 'the first lesson of this course.', finishedGroup: null });
    expect(boxes.middle).toEqual({ kind: 'check' });
    expect(boxes.last).toEqual({ kind: 'grows' });
    expect(boxes.highlight).toBe('first');
    expect(courseBoxesOf(algorithmsCourse, freshMine, { checkFirst: true }).highlight).toBe('middle');
  });

  it('in progress: the review while lessons are due', () => {
    const boxes = courseBoxesOf(algorithmsCourse, progressMine);
    expect(boxes.first).toMatchObject({ kind: 'next', why: 'the next lesson in its group.' });
    expect(boxes.middle).toEqual({ kind: 'due', due: 4 });
    expect(boxes.highlight).toBe('first');
  });

  it('a group just finished: the next group, and the one finished', () => {
    const boxes = courseBoxesOf(algorithmsCourse, groupDoneMine);
    expect(boxes.first).toMatchObject({
      kind: 'next',
      group: 'Stacks and queues',
      why: 'the first lesson of the next group.',
      finishedGroup: 'Hash maps and sets',
    });
  });

  it('the course finished: the rating, the review, and where to go next', () => {
    const boxes = courseBoxesOf(algorithmsCourse, doneMine);
    expect(boxes.first).toEqual({ kind: 'finished', lessons: 86 });
    expect(boxes.middle).toEqual({ kind: 'due', due: 5 });
    expect(boxes.last).toEqual({ kind: 'further', next: algorithmsCourse.next });
  });

  it('the check left in the middle takes the highlight; once saved, the marked lessons show', () => {
    const unfinished = courseBoxesOf(algorithmsCourse, checkUnfinishedMine);
    expect(unfinished.middle).toEqual({ kind: 'check-unfinished', left: 4 });
    expect(unfinished.highlight).toBe('middle');
    const saved = courseBoxesOf(algorithmsCourse, checkSavedMine);
    expect(saved.middle).toEqual({ kind: 'known', known: 37 });
    expect(saved.first).toMatchObject({ kind: 'next', why: 'the first lesson you do not know yet.' });
    expect(courseBoxesOf(algorithmsCourse, knownLaterMine).middle).toEqual({ kind: 'review-none' });
  });

  it('says how long a review takes', () => {
    expect(reviewMinutesWords(1)).toBe('About a minute.');
    expect(reviewMinutesWords(4)).toBe('About 3 minutes.');
  });
});

describe("a course's filters and search", () => {
  const own = mineBySlugOf(progressMine);
  const squareOf = (lesson: { slug: string; paused: boolean }) =>
    courseSquareOf(lesson, own.get(lesson.slug), progressMine.next?.slug ?? null);

  it('keeps To learn for lessons not learned and not marked; Due now for the ones the review asks', () => {
    expect(passesFilter({ kind: 'next', due: false }, 'to-learn')).toBe(true);
    expect(passesFilter({ kind: 'known', due: false }, 'to-learn')).toBe(false);
    expect(passesFilter({ kind: 'learned', due: true }, 'due')).toBe(true);
    const all = algorithmsCourse.groups.flatMap((group) => group.lessons);
    expect(filterCountsOf(all, squareOf)).toEqual({ all: 86, 'to-learn': 76, due: 4 });
  });

  it('matches where a word starts, case aside: "go" finds Go and goroutines, not Algorithms', () => {
    expect(wordStartMatchOf('Go', 'go')).toEqual({ start: 0, end: 2 });
    expect(wordStartMatchOf('A goroutine leak', 'GO')).toEqual({ start: 2, end: 4 });
    expect(wordStartMatchOf('Algorithms', 'go')).toBeNull();
    expect(wordStartMatchOf('Sort (a+b)', '(a+')).toEqual({ start: 5, end: 8 });
    expect(searchQueryOf('  two   words ')).toBe('two words');
    expect(markedTextOf('Sorting and searching', 'search')).toEqual({
      before: 'Sorting and ',
      mark: 'search',
      after: 'ing',
    });
    expect(markedTextOf('Trees', 'search')).toEqual({ text: 'Trees' });
  });

  it('finds lesson titles and group names; a group found by its name shows whole', () => {
    const found = courseSearchOf(algorithmsCourse.groups, 'search');
    expect(found.map((group) => [group.group.name, group.byName, group.lessons.length])).toEqual([
      ['Trees', false, 1],
      ['Graphs', false, 2],
      ['Sorting and searching', true, 10],
    ]);
    expect(courseSearchOf(algorithmsCourse.groups, '')).toHaveLength(9);
  });
});

describe('the keys of a course and of all courses', () => {
  it('"/" finds, Esc clears, Enter on the page takes the lit box, R the review; nothing while typing', () => {
    expect(coursePageKeyOf('/', 'page')).toBe('find');
    expect(coursePageKeyOf('Escape', 'control')).toBe('clear');
    expect(coursePageKeyOf('Enter', 'page')).toBe('enter');
    expect(coursePageKeyOf('Enter', 'control')).toBeNull();
    expect(coursePageKeyOf('r', 'page')).toBe('review');
    expect(coursePageKeyOf('/', 'field')).toBeNull();
    expect(coursePageKeyOf('x', 'page')).toBeNull();
  });
});

describe('all courses', () => {
  it('has a section a kind: topics first, then languages with their usual size', () => {
    const sections = courseSectionsOf(courseCards);
    expect(sections.map((section) => [section.title, section.sub, section.courses.length])).toEqual([
      ['Topics, in any language', 'Every example comes in all seven languages.', 4],
      ['Languages', 'About 100 lessons each.', 7],
    ]);
    expect(courseSectionsOf(courseCards.filter((course) => course.kind === 'LANGUAGE'))).toHaveLength(1);
  });

  it('finds courses by name or kind, then live lessons by name', () => {
    const go = coursesSearchOf(courseCards, lessonList, 'go');
    expect(go.sections.flatMap((section) => section.found.map((found) => found.course.slug))).toEqual(['go']);
    expect(go.sections[0].found[0].name).toEqual({ before: '', mark: 'Go', after: '' });
    // "go deep" starts a word too: the search finds words, not topics.
    expect(go.lessons.map((lesson) => lesson.title)).toEqual([
      'Depth-first search: go deep, then back up',
      'Goroutines: start work without waiting for it',
      'go.mod: one file names every dependency',
      'A goroutine leak: work that never ends',
      'The Go scheduler: many goroutines on a few threads',
    ]);
    expect(text(foundWordsOf(go)!)).toBe('1 course · 5 lessons');
    const languages = coursesSearchOf(courseCards, lessonList, 'language');
    expect(languages.sections.map((section) => section.found.length)).toEqual([7]);
  });

  it('finds no paused lesson, and nothing for a word nothing starts with', () => {
    const sort = coursesSearchOf(courseCards, lessonList, 'sort');
    expect(sort.lessons.some((lesson) => lesson.paused)).toBe(false);
    expect(sort.lessons.length).toBeGreaterThan(6);
    const none = coursesSearchOf(courseCards, lessonList, 'haskell');
    expect(foundWordsOf(none)).toBeNull();
    expect(coursesSearchOf(courseCards, lessonList, '').lessons).toEqual([]);
  });

  it("writes a learner's figure on a card and the bar's parts, known apart and last", () => {
    const [algorithms] = coursesMine;
    expect(courseCardStandingOf({ learned: 0, known: 0 }, 86)).toBeNull();
    expect(courseCardStandingOf(algorithms, 86)).toEqual({
      learned: { count: 10, words: ' of 86 learned' },
      all: false,
      known: null,
    });
    expect(courseCardStandingOf(coursesMineAllLearned, 86)).toMatchObject({ all: true, learned: { count: 86 } });
    expect(courseCardStandingOf(coursesMineChecked, 104)).toMatchObject({ known: 40 });
    expect(courseBarOf(algorithms, 86).map((part) => part.kind)).toEqual(['mastered', 'practised', 'learned']);
    expect(courseBarOf(coursesMineChecked, 104).map((part) => part.kind)).toEqual(['practised', 'learned', 'known']);
    expect(courseBarLabelOf(algorithms, 86)).toBe('10 of 86 lessons learned: 4 practised, 1 mastered');
    expect(courseBarLabelOf(coursesMineChecked, 104)).toBe(
      '12 of 104 lessons learned: 4 practised, 0 mastered, 40 marked as known',
    );
  });

  it('keeps what was typed in the address, and names the Markdown copies', () => {
    expect(coursesSearchPath('go')).toBe('/learn/courses?q=go');
    expect(coursesSearchPath('a b&c')).toBe('/learn/courses?q=a%20b%26c');
    expect(coursesSearchPath('')).toBe('/learn/courses');
    expect(courseMarkdownPath('algorithms')).toBe('/learn/courses/algorithms.md');
    expect(LEARN_COURSES_MARKDOWN_PATH).toBe('/learn/courses.md');
  });
});

describe('the words of these pages', () => {
  it('never hold a long dash', () => {
    const words = [
      courseCountLineOf(algorithmsCourse),
      learnersWords(1240),
      squareLabelOf('x', { kind: 'known', due: true }),
      ...courseSectionsOf(courseCards).flatMap((section) => [section.title, section.sub]),
      courseBarLabelOf(coursesMineChecked, 104),
      JSON.stringify(courseBoxesOf(algorithmsCourse, groupDoneMine)),
    ];
    for (const line of words) expect(line).not.toContain(LONG_DASH);
  });
});
