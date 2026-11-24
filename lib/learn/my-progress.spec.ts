import { describe, expect, it } from 'vitest';

import {
  historyEarlier,
  historyFirst,
  myProgress,
  myProgressEmpty,
  myProgressFirstDay,
  myProgressKnownOnly,
  myProgressLong,
  PROGRESS_TODAY,
} from './__fixtures__/my-progress';
import {
  addLearnDays,
  CALENDAR_WEEKS,
  calendarOf,
  coursesLineOf,
  dayDoneWordsOf,
  dayLabelOf,
  dayLevelOf,
  daysLineOf,
  daysLineWords,
  dayTitleOf,
  finishedWordsOf,
  historyAfter,
  historyBeforeOf,
  historyDayId,
  historyEntriesOf,
  isEmptyProgress,
  isLearnDay,
  type LearnDay,
  learnDayOfDate,
  learnTodayIn,
  lessonsBoxOf,
  lessonsBoxWords,
  myProgressDayOf,
  myProgressPath,
  myProgressViewOf,
  shortDayWords,
} from './my-progress';

const dayOf = (day: string, lessons: number, reviews: number): LearnDay => ({
  day,
  lessons,
  reviews,
  learned: [],
  repeated: [],
});

describe('My progress: the address', () => {
  it('opens History by name and Courses for anything else; Your fixes and Walkthroughs come later', () => {
    expect(myProgressViewOf('history')).toBe('history');
    for (const value of [undefined, '', 'courses', 'fixes', 'walkthroughs', ['history'], 'HISTORY']) {
      expect(myProgressViewOf(value)).toBe('courses');
    }
  });

  it('takes only a real date for the day History opens at', () => {
    expect(myProgressDayOf('2026-11-20')).toBe('2026-11-20');
    for (const value of ['2026-02-30', '2026-11-2', '20-11-2026', 'today', '', null, ['2026-11-20'], '2026-11-20x']) {
      expect(myProgressDayOf(value)).toBeNull();
    }
    expect(isLearnDay('2028-02-29')).toBe(true);
    expect(isLearnDay('2026-02-29')).toBe(false);
  });

  it('builds each view’s address, History at a day, and the id a day has there', () => {
    expect(myProgressPath()).toBe('/learn/progress');
    expect(myProgressPath({ view: 'courses', day: '2026-11-20' })).toBe('/learn/progress');
    expect(myProgressPath({ view: 'history' })).toBe('/learn/progress?view=history');
    expect(myProgressPath({ view: 'history', day: '2026-11-20' })).toBe('/learn/progress?view=history&day=2026-11-20');
    expect(historyDayId('2026-11-20')).toBe('day-2026-11-20');
  });
});

describe('My progress: dates', () => {
  it('counts days across months and years, and writes a date as the boards do', () => {
    expect(addLearnDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addLearnDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(learnDayOfDate(new Date(2026, 10, 5, 23, 30))).toBe('2026-11-05');
    expect(shortDayWords('2026-06-08', PROGRESS_TODAY)).toBe('8 Jun');
    expect(shortDayWords('2025-12-30', PROGRESS_TODAY)).toBe('30 Dec 2025');
    expect(dayTitleOf('2026-11-22', PROGRESS_TODAY)).toBe('Today, Sunday 22 Nov');
    expect(dayTitleOf('2026-11-20', PROGRESS_TODAY)).toBe('Friday 20 Nov');
    expect(dayTitleOf('2025-12-30', PROGRESS_TODAY)).toBe('Tuesday 30 Dec 2025');
  });
});

describe('My progress: the box "Lessons"', () => {
  it('counts the lessons learned, a row for each depth with something in it, and marked as known apart', () => {
    const box = lessonsBoxOf(myProgress);
    expect(box).toMatchObject({ kind: 'learned', learned: 105 });
    if (box?.kind !== 'learned') throw new Error('learned');
    expect(box.depths.map((row) => [row.kind, row.count, Math.round(row.share)])).toEqual([
      ['learned', 105, 100],
      ['practised', 31, 30],
      ['mastered', 2, 2],
    ]);
    expect(box.known).toMatchObject({ kind: 'known', label: 'Marked as known', count: 37 });
    expect(lessonsBoxWords(box)).toBe('lessons learned');
  });

  it('has no row and no number for a depth with nothing in it', () => {
    const box = lessonsBoxOf(myProgressFirstDay);
    if (box?.kind !== 'learned') throw new Error('learned');
    expect(box.depths.map((row) => row.kind)).toEqual(['learned']);
    expect(box.known).toBeNull();
    expect(lessonsBoxWords(box)).toBe('lesson learned');
  });

  it('counts what is marked as known when nothing is learned, and never calls it learned', () => {
    const box = lessonsBoxOf(myProgressKnownOnly);
    expect(box).toEqual({ kind: 'known', known: 37 });
    expect(box && lessonsBoxWords(box)).toBe('lessons marked as known');
  });

  it('has no box with nothing learned and nothing marked, and keeps every bar within its row', () => {
    expect(lessonsBoxOf(myProgressEmpty)).toBeNull();
    const box = lessonsBoxOf({ learned: 3, practised: 0, mastered: 0, known: 40 });
    expect(box?.kind === 'learned' && box.known?.share).toBe(100);
  });

  it('has nothing to show only with nothing learned, nothing marked and no day counted', () => {
    expect(isEmptyProgress(myProgressEmpty)).toBe(true);
    expect(isEmptyProgress(myProgressKnownOnly)).toBe(false);
    expect(isEmptyProgress({ learned: 0, known: 0, activeDays: 2 })).toBe(false);
  });
});

describe('My progress: the box "Days"', () => {
  it('shades a day by what was done on it, in five steps', () => {
    expect([0, 1, 2, 3, 5, 6, 9, 10, 40].map((done) => dayLevelOf(dayOf('2026-11-20', done, 0)))).toEqual([
      0, 1, 1, 2, 2, 3, 3, 4, 4,
    ]);
    expect(dayLevelOf(dayOf('2026-11-20', 2, 4))).toBe(3);
    expect(dayLevelOf(undefined)).toBe(0);
    expect(dayLevelOf(dayOf('2026-11-20', -3, 0))).toBe(0);
  });

  it('draws 26 weeks from Monday, the week of today last and cut at today, with each month over its first Monday', () => {
    const calendar = calendarOf(myProgress.days, PROGRESS_TODAY);
    expect(calendar.weeks).toHaveLength(CALENDAR_WEEKS);
    expect(calendar.weeks[0][0].day).toBe('2026-05-25');
    expect(calendar.weeks.at(-1)?.at(-1)?.day).toBe(PROGRESS_TODAY);
    expect(calendar.weeks.flat()).toHaveLength(182);
    expect(calendar.months).toEqual([
      null,
      'Jun',
      null,
      null,
      null,
      null,
      'Jul',
      null,
      null,
      null,
      'Aug',
      null,
      null,
      null,
      null,
      'Sep',
      null,
      null,
      null,
      'Oct',
      null,
      null,
      null,
      'Nov',
      null,
      null,
    ]);
    const shown = calendar.weeks.flat().filter((cell) => cell.done);
    expect(shown).toHaveLength(myProgress.days.length);
    expect(calendar.weeks.flat().find((cell) => cell.day === '2026-11-21')).toMatchObject({ level: 4 });
  });

  it('stops at today in the middle of a week, and moves today on to a later day the API answers', () => {
    const wednesday = calendarOf([], '2026-11-18');
    expect(wednesday.weeks.at(-1)?.map((cell) => cell.day)).toEqual(['2026-11-16', '2026-11-17', '2026-11-18']);
    const ahead = calendarOf([dayOf('2026-11-19', 1, 0)], '2026-11-18');
    expect(ahead.weeks.at(-1)?.at(-1)).toMatchObject({ day: '2026-11-19', level: 1 });
    expect(
      calendarOf([dayOf('not a day', 1, 0)], '2026-11-18')
        .weeks.flat()
        .some((cell) => cell.done),
    ).toBe(false);
  });

  it('says what was done on a day, each part only when above zero', () => {
    expect(dayDoneWordsOf(dayOf('2026-11-20', 2, 6))).toEqual(['2 lessons learned', '6 lessons repeated']);
    expect(dayDoneWordsOf(dayOf('2026-11-20', 1, 0))).toEqual(['1 lesson learned']);
    expect(dayDoneWordsOf(dayOf('2026-11-20', 0, 1))).toEqual(['1 lesson repeated']);
    expect(dayLabelOf(dayOf('2026-11-20', 2, 6), PROGRESS_TODAY)).toBe(
      'Friday 20 Nov: 2 lessons learned, 6 lessons repeated',
    );
    // Active for something else (a merged fix, a walkthrough): words, never an empty colon or a zero.
    expect(dayLabelOf(dayOf('2026-11-20', 0, 0), PROGRESS_TODAY)).toBe('Friday 20 Nov: active');
  });

  it('counts the days, since the first one only when the calendar holds every day counted', () => {
    expect(daysLineOf(myProgress, PROGRESS_TODAY)).toEqual({ kind: 'days', count: 80, since: '8 Jun' });
    expect(daysLineOf(myProgressLong, PROGRESS_TODAY)).toEqual({ kind: 'days', count: 212, since: null });
    expect(daysLineOf(myProgressFirstDay, PROGRESS_TODAY)).toEqual({ kind: 'first' });
    expect(daysLineOf({ days: [dayOf('2026-11-20', 1, 0)], activeDays: 1 }, PROGRESS_TODAY)).toEqual({
      kind: 'days',
      count: 1,
      since: '20 Nov',
    });
    expect(daysLineOf(myProgressKnownOnly, PROGRESS_TODAY)).toEqual({ kind: 'none' });
  });

  it('words the line, never with a zero', () => {
    expect(daysLineWords({ kind: 'days', count: 80, since: '8 Jun' })).toEqual({
      before: 'You were active on ',
      after: ' days since 8 Jun.',
    });
    expect(daysLineWords({ kind: 'days', count: 1, since: null })).toEqual({
      before: 'You were active on ',
      after: ' day.',
    });
    expect(daysLineWords({ kind: 'first' })).toBe('Your first day.');
    expect(daysLineWords({ kind: 'none' })).toBe('The days you learn or repeat a lesson show here.');
  });
});

describe('My progress: Courses', () => {
  it('counts the courses started, and the finished ones only when there are some', () => {
    expect(coursesLineOf(myProgress.courses)).toEqual({ started: 3, finished: 1 });
    expect(coursesLineOf(myProgressFirstDay.courses)).toEqual({ started: 1, finished: null });
    expect(coursesLineOf([])).toBeNull();
  });

  it('says the day a course was finished, and nothing for a time it cannot read', () => {
    expect(finishedWordsOf('2026-11-12T16:20:00.000Z', PROGRESS_TODAY)).toBe('Finished on 12 Nov');
    expect(finishedWordsOf('soon', PROGRESS_TODAY)).toBeNull();
  });
});

describe('My progress: History', () => {
  it('opens a page at the day after the one asked, so that day comes first', () => {
    expect(historyBeforeOf('2026-11-20')).toBe('2026-11-21');
    expect(historyBeforeOf(null)).toBeNull();
  });

  it('lists the review first, then the lessons learned, each only when above zero, with the lessons a page shows', () => {
    const [today, saturday] = historyFirst.days;
    expect(historyEntriesOf(today).map((entry) => [entry.kind, entry.count, entry.words, entry.links.length])).toEqual([
      ['review', 6, 'lessons', 3],
      ['lessons', 2, 'lessons', 2],
    ]);
    // A lesson no page shows any more: counted, not linked.
    expect(historyEntriesOf(saturday).find((entry) => entry.kind === 'lessons')).toMatchObject({
      count: 1,
      words: 'lesson',
      links: [],
    });
    expect(historyEntriesOf(dayOf('2026-11-20', 0, 0))).toEqual([]);
  });

  it('adds a page of earlier days after the ones shown, never a day twice', () => {
    const days = historyAfter(historyFirst.days, [historyFirst.days.at(-1) as LearnDay, ...historyEarlier.days]);
    expect(days.map((day) => day.day)).toEqual([
      ...historyFirst.days.map((day) => day.day),
      ...historyEarlier.days.map((day) => day.day),
    ]);
  });
});

describe('My progress: today, as the API counts days', () => {
  // 03:30 UTC on Sunday 22 Nov: still Saturday in New York, already Sunday in Tokyo.
  const now = new Date('2026-11-22T03:30:00.000Z');

  it('is the date in the zone the person saved', () => {
    expect(learnTodayIn(now, 'Asia/Tokyo')).toBe('2026-11-22');
    expect(learnTodayIn(now, 'Europe/London')).toBe('2026-11-22');
    expect(learnTodayIn(now, 'America/Los_Angeles')).toBe('2026-11-21');
  });

  it("is the date in Learn's default zone with no zone saved, or one that is not a real zone", () => {
    expect(learnTodayIn(now, null)).toBe('2026-11-21');
    expect(learnTodayIn(now, 'Mars/Olympus')).toBe('2026-11-21');
  });
});
