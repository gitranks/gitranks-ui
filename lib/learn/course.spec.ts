import { describe, expect, it } from 'vitest';

import {
  algorithmsCourse,
  algorithmsCoursePaused,
  allKnownMine,
  checkSavedMine,
  checkUnfinishedMine,
  courseCards,
  coursesMine,
  coursesMineAllLearned,
  coursesMineChecked,
  doneMine,
  donePausedMine,
  donePausedUnstampedMine,
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
  courseFinishedOf,
  coursePageKeyOf,
  courseProgressLineOf,
  courseSearchOf,
  courseSectionsOf,
  courseSquareOf,
  coursesSearchOf,
  filterCountsOf,
  foldedOf,
  foundWordsOf,
  goodShareOf,
  groupHeadOf,
  groupSquaresCountOf,
  groupStandingOf,
  isPausedSquare,
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

  it('is paused, never next nor due; a lesson learned before keeps its depth', () => {
    const paused = algorithmsCoursePaused.groups[2].lessons.find((lesson) => lesson.paused)!;
    const learned = courseSquareOf(paused, { slug: paused.slug, depth: 'LEARNED', known: false, due: true }, null);
    expect(learned).toEqual({ kind: 'learned', due: false, paused: true });
    expect(isPausedSquare(learned)).toBe(true);
    expect(squareLabelOf('Sets', learned)).toBe('Sets · Learned · paused');
    expect(squareHintOf(learned)).toBeNull();
    expect(courseSquareOf(paused, undefined, paused.slug)).toEqual({ kind: 'paused', due: false });
  });

  it('keeps the mark of a paused lesson marked as known, as its group counts it', () => {
    const hashMaps = algorithmsCoursePaused.groups[2];
    const paused = hashMaps.lessons.find((lesson) => lesson.paused)!;
    const known = courseSquareOf(paused, { slug: paused.slug, depth: 'NONE', known: true, due: false }, null);
    expect(known).toEqual({ kind: 'known', due: false, paused: true });
    expect(isPausedSquare(known)).toBe(true);
    expect(squareLabelOf('Sets', known)).toBe('Sets · marked as known · paused');
    expect(squareHintOf(known)).toBeNull();
    // "Hash maps and sets" says 7 marked as known, and draws 7 grey squares.
    const own = mineBySlugOf(checkSavedMine);
    const squares = hashMaps.lessons.map((lesson) =>
      courseSquareOf(lesson, own.get(lesson.slug), checkSavedMine.next!.slug),
    );
    expect(groupStandingOf(hashMaps, own).known).toBe(7);
    expect(squares.filter((square) => square.kind === 'known')).toHaveLength(7);
  });

  it('labels and hints in plain words', () => {
    expect(squareLabelOf('Big-O', { kind: 'learned', due: true })).toBe('Big-O · Learned · due now');
    expect(squareLabelOf('Big-O', { kind: 'known', due: false })).toBe('Big-O · marked as known');
    expect(squareLabelOf('Big-O', { kind: 'next', due: false })).toBe('Big-O · next, not started');
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

  it('counts a paused lesson learned before, and says Done once every lesson not paused is learned', () => {
    const hashMaps = algorithmsCoursePaused.groups[2];
    // 3-1, 3-2 and 3-3 learned; 3-3 is the paused one, and its square keeps its colour.
    expect(text(groupHeadOf(groupStandingOf(hashMaps, mineBySlugOf(progressMine))))).toBe('3 of 9 learned');
    const allButPaused = new Map(
      hashMaps.lessons
        .filter((lesson) => !lesson.paused)
        .map((lesson) => [lesson.slug, { slug: lesson.slug, depth: 'LEARNED' as const, known: false, due: false }]),
    );
    expect(groupStandingOf(hashMaps, allButPaused)).toMatchObject({ learned: 8, count: 9, done: true });
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

  it('for a session with no side: never signing in; nothing lit while it is on its way, else the first lesson', () => {
    const pending = courseBoxesOf(algorithmsCourse, null, { person: 'pending' });
    expect(pending.first).toMatchObject({ kind: 'start', lesson: { slug: lessonAt('1-1').slug } });
    expect(pending.middle).toEqual({ kind: 'check' });
    expect(pending.last).toEqual({ kind: 'grows' });
    expect(pending.highlight).toBeNull();
    const session = courseBoxesOf(algorithmsCourse, null, { person: 'session', checkFirst: true });
    expect(session.highlight).toBe('first');
    // No check offered: where to go after the course takes the last box, never signing in.
    const noCheck = courseBoxesOf({ ...algorithmsCourse, checkOffered: false }, null, { person: 'session' });
    expect(noCheck.middle).toEqual({ kind: 'grows' });
    expect(noCheck.last).toEqual({ kind: 'further', next: algorithmsCourse.next });
    // Every lesson paused: nothing to start, nothing lit.
    const allPaused = {
      ...algorithmsCourse,
      groups: algorithmsCourse.groups.map((group) => ({
        ...group,
        lessons: group.lessons.map((lesson) => ({ ...lesson, paused: true })),
      })),
    };
    expect(courseBoxesOf(allPaused, null, { person: 'session' }).highlight).toBeNull();
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

  it('the course finished: the rating as given, the review, and where to go next', () => {
    const boxes = courseBoxesOf(algorithmsCourse, doneMine);
    expect(boxes.first).toEqual({ kind: 'finished', learned: 86, lessons: 86, pausedLeft: 0, rated: true });
    expect(boxes.middle).toEqual({ kind: 'due', due: 5 });
    expect(boxes.last).toEqual({ kind: 'further', next: algorithmsCourse.next });
  });

  it('finished with a paused lesson never answered: the box counts what the line under the title counts', () => {
    const boxes = courseBoxesOf(algorithmsCoursePaused, donePausedMine);
    expect(boxes.first).toEqual({ kind: 'finished', learned: 85, lessons: 86, pausedLeft: 1, rated: null });
    expect(text(courseProgressLineOf(donePausedMine, algorithmsCoursePaused)!.parts)).toMatch(/^85 of 86 learned/);
    // Finished: nothing is offered to mark as known.
    expect(courseProgressLineOf(donePausedMine, algorithmsCoursePaused)!.check).toBeNull();
  });

  it('finished, never stamped (the last lesson paused before it was reached): the box and the line agree', () => {
    expect(courseFinishedOf(algorithmsCoursePaused, donePausedUnstampedMine)).toBe(true);
    const boxes = courseBoxesOf(algorithmsCoursePaused, donePausedUnstampedMine);
    expect(boxes.first).toMatchObject({ kind: 'finished', learned: 85, lessons: 86, pausedLeft: 1 });
    expect(boxes.last).toMatchObject({ kind: 'further' });
    expect(courseProgressLineOf(donePausedUnstampedMine, algorithmsCoursePaused)!.check).toBeNull();
    // On the course with nothing paused, the same lessons leave one to learn: not finished, the check is offered.
    expect(courseFinishedOf(algorithmsCourse, donePausedUnstampedMine)).toBe(false);
    expect(courseProgressLineOf(donePausedUnstampedMine, algorithmsCourse)!.check).toBe(
      'Mark lessons you already know',
    );
  });

  it('a finished course lights the review while lessons are due, and no box otherwise', () => {
    expect(courseBoxesOf(algorithmsCourse, doneMine).highlight).toBe('middle');
    const nothingDue = courseBoxesOf(algorithmsCourse, { ...doneMine, due: 0 });
    expect(nothingDue.middle).toEqual({ kind: 'review-none' });
    expect(nothingDue.highlight).toBeNull();
  });

  it('every lesson left marked as known: the first of them, to learn it by answering, highlighted', () => {
    const boxes = courseBoxesOf(algorithmsCourse, allKnownMine);
    expect(boxes.first).toMatchObject({ kind: 'known-left', lesson: { slug: lessonAt('1-2').slug }, known: 85 });
    expect(boxes.highlight).toBe('first');
  });

  it('every lesson left paused: it says so, and takes no highlight', () => {
    const paused = {
      ...algorithmsCourse,
      groups: algorithmsCourse.groups.map((group) => ({
        ...group,
        lessons: group.lessons.map((lesson) => ({ ...lesson, paused: true })),
      })),
    };
    const mine = { ...freshMine, next: null };
    expect(courseBoxesOf(paused, mine).first).toEqual({ kind: 'paused-left', paused: 86 });
    expect(courseBoxesOf(paused, mine).highlight).toBe('middle');
    expect(courseBoxesOf(paused, null).first).toEqual({ kind: 'paused-left', paused: 86 });
  });

  it('the first lesson a learner can take is the first, when the course starts with a paused one', () => {
    const [big, ...rest] = algorithmsCourse.groups;
    const course = {
      ...algorithmsCourse,
      groups: [{ ...big, lessons: [{ ...big.lessons[0], paused: true }, ...big.lessons.slice(1)] }, ...rest],
    };
    const next = lessonAt('1-2');
    const boxes = courseBoxesOf(course, { ...freshMine, next: { slug: next.slug, title: next.title } });
    expect(boxes.first).toMatchObject({ why: 'the first lesson of this course.' });
    expect(courseBoxesOf(course, null).first).toMatchObject({ kind: 'start', lesson: { slug: next.slug } });
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

  it("makes the last box a learner's open issues for a course not finished, and as before with none", () => {
    expect(courseBoxesOf(algorithmsCourse, progressMine, { openIssues: 2 }).last).toEqual({ kind: 'issues', count: 2 });
    // A finished course keeps where to go next, which names the open issues among the ways on.
    expect(courseBoxesOf(algorithmsCourse, doneMine, { openIssues: 3 }).last).toEqual({
      kind: 'further',
      next: algorithmsCourse.next,
      issues: 3,
    });
    expect(courseBoxesOf(algorithmsCourse, doneMine).last).toEqual({ kind: 'further', next: algorithmsCourse.next });
    for (const openIssues of [0, null, undefined, -1]) {
      expect(courseBoxesOf(algorithmsCourse, progressMine, { openIssues }), String(openIssues)).toEqual(
        courseBoxesOf(algorithmsCourse, progressMine),
      );
    }
    // Never for a visitor, or a session without its side.
    expect(courseBoxesOf(algorithmsCourse, null, { openIssues: 2 }).last).toEqual({ kind: 'sign-in' });
    expect(courseBoxesOf(algorithmsCourse, null, { person: 'session', openIssues: 2 }).last.kind).not.toBe('issues');
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

  it('never finds a paused lesson by its title; a group found by its name keeps it in its place', () => {
    expect(courseSearchOf(algorithmsCoursePaused.groups, 'duplicates')).toEqual([]);
    expect(courseSearchOf(algorithmsCourse.groups, 'duplicates')).toHaveLength(1);
    const byName = courseSearchOf(algorithmsCoursePaused.groups, 'hash maps');
    expect(byName[0].lessons.some((lesson) => lesson.paused)).toBe(true);
  });

  it('folds accents and Unicode forms on both sides, and marks the letters as written', () => {
    expect(wordStartMatchOf('Résumé of a list', 'resume')).toEqual({ start: 0, end: 6 });
    const decomposed = 'Résumé of a list'.normalize('NFD');
    expect(decomposed).toHaveLength(18);
    expect(wordStartMatchOf(decomposed, 'résumé')).toEqual({ start: 0, end: 8 });
    expect(markedTextOf('A café menu', 'cafe')).toEqual({ before: 'A ', mark: 'café', after: ' menu' });
    expect(markedTextOf('Naïve string search', 'NAI')).toEqual({ before: '', mark: 'Naï', after: 've string search' });
    expect(foldedOf('Ça va').folded).toBe('Ca va');
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
    // No zero, even for a screen reader: each part only when there is one.
    expect(courseBarLabelOf(coursesMineChecked, 104)).toBe(
      '12 of 104 lessons learned: 4 practised, 40 marked as known',
    );
    expect(courseBarLabelOf({ learned: 3, practised: 0, mastered: 0, known: 0 }, 104)).toBe('3 of 104 lessons learned');
    expect(courseBarLabelOf({ learned: 0, practised: 0, mastered: 0, known: 40 }, 104)).toBe(
      '40 of 104 lessons marked as known',
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
