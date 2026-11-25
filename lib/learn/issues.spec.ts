import { describe, expect, it } from 'vitest';

import { issueRows, listNone, listOutsideForYou, personalList, views } from './__fixtures__/issues';
import {
  bareRowOf,
  emailCoverOf,
  emailOnLineOf,
  ISSUES_VIEW,
  issuesBackOf,
  issuesCanonicalOf,
  issuesChipsOf,
  issuesCountTextOf,
  issuesEmailStateOf,
  issuesEndOf,
  issuesHrefOf,
  issuesInputOf,
  issuesListOf,
  issuesListPublicOf,
  issuesMarkdownPathOf,
  issuesMinePathOf,
  issuesPublicInputOf,
  issuesRowOf,
  issuesShowFixedRedirectOf,
  issuesSwitchesOf,
  issuesViewOf,
  issuesViewQueryOf,
  mergedOnOf,
  rowLessonOf,
  rowsAfterSkip,
  switchCountLabelOf,
  unchippedOf,
  visitorEndOf,
} from './issues';
import { maskedIssue } from '@/lib/workspace/__fixtures__/masked-issue';
import { learnIssuesPathOf } from '@/lib/workspace/paths';

describe('the view in the address', () => {
  it('reads "For you" on unless turned off, the rest off unless set', () => {
    expect(issuesViewOf({})).toEqual(ISSUES_VIEW);
    expect(issuesViewOf({ 'for-you': '0', learned: '1', fixed: '1' })).toEqual({
      ...ISSUES_VIEW,
      forYou: false,
      learned: true,
      show: 'fixed',
    });
    expect(issuesViewOf({ 'for-you': '1', learned: 'yes', fixed: 'true' })).toEqual(ISSUES_VIEW);
  });

  it("shows both groups on a lesson's or a course's own address, open issues alone with `open=1`, fixes with `fixed=1`", () => {
    const own = { lesson: 'binary-search' };
    expect(issuesViewOf({}, own).show).toBe('both');
    expect(issuesViewOf({ open: '1' }, own).show).toBe('open');
    expect(issuesViewOf({ fixed: '1' }, own).show).toBe('fixed');
    expect(issuesViewOf({ open: '1', fixed: '1' }, { course: 'algorithms' }).show).toBe('fixed');
    expect(issuesViewOf({ open: 'yes' }, own).show).toBe('both');
    // Issues itself shows open issues unless "Fixed" is set: `open=1` means nothing there.
    expect(issuesViewOf({ lesson: 'binary-search', open: '1' }).show).toBe('open');
    expect(issuesViewOf({ lesson: 'binary-search' }).show).toBe('open');
  });

  it('keeps a lesson, a course and a language of the right shape only', () => {
    expect(issuesViewOf({ lesson: 'binary-search', course: 'algorithms', language: 'Go' })).toMatchObject({
      lesson: 'binary-search',
      course: 'algorithms',
      language: 'go',
    });
    expect(issuesViewOf({ lesson: 'Binary Search', course: '../x', language: 'cobol' })).toMatchObject({
      lesson: null,
      course: null,
      language: null,
    });
    // A repeated parameter: the first.
    expect(issuesViewOf({ language: ['rust', 'go'] }).language).toBe('rust');
  });

  it("sets the lesson or the course from a view's own address, over the query", () => {
    expect(issuesViewOf({ lesson: 'other' }, { lesson: 'binary-search' }).lesson).toBe('binary-search');
    expect(issuesViewOf({}, { course: 'algorithms' }).course).toBe('algorithms');
  });

  it('writes a view back in one order, without what is as it is by default', () => {
    expect(issuesHrefOf(ISSUES_VIEW)).toBe('/learn/issues');
    expect(
      issuesHrefOf({
        lesson: 'binary-search',
        course: 'algorithms',
        language: 'go',
        show: 'fixed',
        forYou: false,
        learned: true,
        repo: null,
        org: null,
      }),
    ).toBe('/learn/issues?course=algorithms&lesson=binary-search&language=go&fixed=1&for-you=0&learned=1');
    // On Issues itself a view shows open issues or fixes, never both.
    for (const view of Object.values(views)) {
      expect(issuesViewOf(Object.fromEntries(new URL(issuesHrefOf(view), 'https://x').searchParams))).toEqual({
        ...view,
        show: view.show === 'fixed' ? 'fixed' : 'open',
      });
    }
  });

  it("stays on a lesson's or a course's own address while the view names it", () => {
    expect(issuesHrefOf(views.lesson, 'lesson')).toBe('/learn/lessons/find-duplicates-with-a-set/real-world');
    expect(issuesHrefOf({ ...views.lesson, language: 'go' }, 'lesson')).toBe(
      '/learn/lessons/find-duplicates-with-a-set/real-world?language=go',
    );
    // Both groups are the address's own; open issues alone or fixes alone are written.
    expect(issuesHrefOf(views.course, 'course')).toBe('/learn/courses/algorithms/real-world?open=1&learned=1');
    expect(issuesHrefOf(views.courseFixed, 'course')).toBe('/learn/courses/algorithms/real-world?fixed=1');
    expect(issuesHrefOf({ ...views.course, show: 'both' }, 'course')).toBe(
      '/learn/courses/algorithms/real-world?learned=1',
    );
    // Without it, the view is Issues' own.
    expect(issuesHrefOf({ ...views.lesson, lesson: null }, 'lesson')).toBe('/learn/issues');
  });

  it('points search engines to the chips with the switches as they are by default, and the copy without "Fixed"', () => {
    expect(issuesCanonicalOf({ ...views.language, forYou: false, learned: true })).toBe('/learn/issues?language=go');
    expect(issuesCanonicalOf(views.courseFixed)).toBe('/learn/issues?course=algorithms&fixed=1');
    expect(issuesMarkdownPathOf(views.courseFixed)).toBe('/learn/issues.md?course=algorithms');
    expect(issuesMarkdownPathOf(views.plain)).toBe('/learn/issues.md');
    expect(issuesMarkdownPathOf(views.lesson, 'lesson')).toBe(
      '/learn/lessons/find-duplicates-with-a-set/real-world.md',
    );
  });

  it('reads the person\'s five by the switches and the chips, never by "Fixed"', () => {
    expect(issuesMinePathOf(ISSUES_VIEW)).toBe('/api/me/learn/issues');
    expect(issuesMinePathOf({ ...views.courseFixed, forYou: false })).toBe(
      '/api/me/learn/issues?course=algorithms&for-you=0',
    );
  });

  it("gives the API's input from a view", () => {
    expect(issuesPublicInputOf(views.course)).toEqual({
      lesson: null,
      course: 'algorithms',
      language: null,
      repo: null,
      org: null,
    });
    expect(issuesInputOf(views.course)).toEqual({
      lesson: null,
      course: 'algorithms',
      language: null,
      repo: null,
      org: null,
      forYou: true,
      learned: true,
    });
  });

  it('drops the chips and keeps the switches for "Clear filters"', () => {
    expect(unchippedOf({ ...views.courseFixed, language: 'go', forYou: false })).toEqual({
      ...ISSUES_VIEW,
      forYou: false,
    });
  });
});

describe("a view as a row's link carries it to the page of one issue", () => {
  it("writes the view's query, and the lesson's or the course's own page while the view names it", () => {
    expect(issuesViewQueryOf(ISSUES_VIEW)).toBe('');
    expect(issuesViewQueryOf(views.course)).toBe('course=algorithms&learned=1');
    expect(issuesViewQueryOf(views.lesson, 'lesson')).toBe('lesson=find-duplicates-with-a-set&at=lesson');
    expect(issuesViewQueryOf(views.course, 'course')).toBe('course=algorithms&open=1&learned=1&at=course');
    // A lesson's page whose view no longer names the lesson is Issues' own.
    expect(issuesViewQueryOf(views.language, 'lesson')).toBe('language=go');
  });

  it('is read back by the way back into the same address the view has', () => {
    for (const [view, at] of [
      [ISSUES_VIEW, 'issues'],
      [views.course, 'issues'],
      [views.lesson, 'lesson'],
      [views.course, 'course'],
      [{ ...views.lesson, course: 'algorithms', forYou: false }, 'lesson'],
    ] as const) {
      expect(learnIssuesPathOf(new URLSearchParams(issuesViewQueryOf(view, at)))).toBe(issuesHrefOf(view, at));
    }
  });
});

describe('chips and the way back', () => {
  it('draws the course, the lesson, the language and "Fixed", each with the address without it', () => {
    const chips = issuesChipsOf(
      { ...ISSUES_VIEW, course: 'algorithms', lesson: 'binary-search', language: 'go', show: 'fixed' },
      { course: 'Algorithms and data structures', lesson: 'Binary search' },
    );
    expect(chips.map(({ key, label }) => [key, label])).toEqual([
      ['course', 'Course: Algorithms and data structures'],
      ['lesson', 'Lesson: Binary search'],
      ['language', 'Language: Go'],
      ['fixed', 'Fixed'],
    ]);
    expect(chips[0].removeHref).toBe('/learn/issues?lesson=binary-search&language=go&fixed=1');
    expect(chips[3].removeHref).toBe('/learn/issues?course=algorithms&lesson=binary-search&language=go');
  });

  it('shows the slug when a name could not be read, and leaves a view of its own address when its chip goes', () => {
    const [, chip] = issuesChipsOf(views.lesson, {}, 'lesson');
    expect(chip.label).toBe('Lesson: find-duplicates-with-a-set');
    expect(chip.removeHref).toBe('/learn/issues');
    const [, fixedAlone] = issuesChipsOf({ ...views.lesson, show: 'fixed' }, {}, 'lesson');
    expect(fixedAlone.removeHref).toBe('/learn/issues?fixed=1');
  });

  it('draws what an own view shows first, as a chip: both groups, or one of them, the other way back', () => {
    const chipOf = (show: 'both' | 'open' | 'fixed') => issuesChipsOf({ ...views.lesson, show }, {}, 'lesson')[0];
    expect(chipOf('both')).toEqual({
      key: 'show',
      label: 'Open and fixed',
      removeHref: '/learn/lessons/find-duplicates-with-a-set/real-world?open=1',
    });
    expect(chipOf('open')).toEqual({
      key: 'show',
      label: 'Open',
      removeHref: '/learn/lessons/find-duplicates-with-a-set/real-world',
    });
    expect(chipOf('fixed')).toEqual({
      key: 'show',
      label: 'Fixed',
      removeHref: '/learn/lessons/find-duplicates-with-a-set/real-world',
    });
    // Off its own address there is no such chip, and "Fixed" is the last chip as on Issues.
    expect(issuesChipsOf(views.courseFixed).map((chip) => chip.key)).toEqual(['course', 'fixed']);
  });

  it('leads back to the lesson, or else the course, that opened the page', () => {
    expect(issuesBackOf(views.lesson, { lesson: 'Find duplicates' })).toEqual({
      label: 'Find duplicates',
      href: '/learn/lessons/find-duplicates-with-a-set',
    });
    expect(issuesBackOf(views.course)).toEqual({ label: 'algorithms', href: '/learn/courses/algorithms' });
    expect(issuesBackOf(views.language)).toBeNull();
  });
});

describe('switches and counts', () => {
  it('shows a count, never a zero, and the cap as "1,000+"', () => {
    expect(issuesCountTextOf(212)).toBe('212');
    expect(issuesCountTextOf(1000)).toBe('1,000');
    expect(issuesCountTextOf(1001)).toBe('1,000+');
    for (const none of [0, -1, null, undefined, Number.NaN]) expect(issuesCountTextOf(none)).toBeNull();
  });

  it('draws both switches, a count only on one that is off, and the view once pressed', () => {
    const [forYou, learned] = issuesSwitchesOf(ISSUES_VIEW, personalList());
    expect(forYou).toEqual({
      key: 'for-you',
      label: 'For you',
      on: true,
      count: null,
      href: '/learn/issues?for-you=0',
    });
    expect(learned).toEqual({
      key: 'learned',
      label: 'Lessons I learned',
      on: false,
      count: '14',
      href: '/learn/issues?learned=1',
    });
    const [, off] = issuesSwitchesOf(views.course, { forYouCount: null, learnedCount: null }, 'course');
    expect(off).toMatchObject({ on: true, count: null, href: '/learn/courses/algorithms/real-world?open=1' });
  });

  it('never puts the count of the list without a pressed switch on that switch', () => {
    const list = { forYouCount: 1001, learnedCount: 1001 };
    const [forYou, learned] = issuesSwitchesOf(views.learned, list);
    expect([forYou.count, learned.count]).toEqual([null, null]);
    const [forYouOff, learnedOff] = issuesSwitchesOf({ ...ISSUES_VIEW, forYou: false }, list);
    expect([forYouOff.count, learnedOff.count]).toEqual(['1,000+', '1,000+']);
    const [forYouMixed, learnedMixed] = issuesSwitchesOf({ ...views.learned, forYou: false }, list);
    expect([forYouMixed.count, learnedMixed.count]).toEqual(['1,000+', null]);
  });

  it('says what pressing a switch shows', () => {
    expect(switchCountLabelOf('1')).toBe('1 issue once pressed');
    expect(switchCountLabelOf('1,000+')).toBe('1,000+ issues once pressed');
  });
});

describe('rows', () => {
  it('says a lesson was learned or is new, and nothing without a lesson', () => {
    expect(rowLessonOf(issueRows[0])).toEqual({
      title: 'Find duplicates in one pass with a set',
      href: '/learn/lessons/find-duplicates-with-a-set',
      learned: true,
    });
    expect(rowLessonOf(issueRows[2])?.learned).toBe(false);
    expect(rowLessonOf(issueRows[4])).toBeNull();
    expect(rowLessonOf({ lesson: issueRows[0].lesson, why: 'NO_LESSON' })).toBeNull();
  });

  it("says every lesson is new on a visitor's row", () => {
    expect(rowLessonOf(issueRows[0], true)?.learned).toBe(false);
  });

  it("puts the read's first new issue in the skipped row's place, the others where they were", () => {
    const fresh = { ...issueRows[0], issue: maskedIssue({ id: 'fresh001' }) };
    const read = [issueRows[1], fresh, issueRows[3]];
    const after = rowsAfterSkip(issueRows, issueRows[2].issue.id, read);
    expect(after.map((row) => row.issue.id)).toEqual([
      issueRows[0].issue.id,
      issueRows[1].issue.id,
      'fresh001',
      issueRows[3].issue.id,
      issueRows[4].issue.id,
    ]);
  });

  it("takes the skip's next issue only when the list cannot be read again, and drops the row with nothing new", () => {
    const next = maskedIssue({ id: 'next0001' });
    const after = rowsAfterSkip(issueRows, issueRows[0].issue.id, null, { fallback: bareRowOf(next) });
    expect(after[0]).toEqual({ issue: next, full: null, lesson: null, why: 'NO_LESSON', learnOnly: false });
    expect(rowsAfterSkip(issueRows, issueRows[0].issue.id, issueRows)).toHaveLength(4);
    // A read that answered with nothing new drops the row: the next issue never stands in then.
    const dropped = rowsAfterSkip(issueRows, issueRows[0].issue.id, issueRows, { fallback: bareRowOf(next) });
    expect(dropped.map((row) => row.issue.id)).toEqual(issueRows.slice(1).map((row) => row.issue.id));
    expect(rowsAfterSkip(issueRows, issueRows[0].issue.id, [], { fallback: bareRowOf(next) })).toHaveLength(4);
    // A fallback already on the screen is not drawn twice.
    expect(rowsAfterSkip(issueRows, issueRows[0].issue.id, null, { fallback: issueRows[1] })).toHaveLength(4);
  });

  it('never brings back a row skipped earlier in the view', () => {
    const fresh = { ...issueRows[0], issue: maskedIssue({ id: 'fresh001' }) };
    const shown = issueRows.slice(1);
    const read = [issueRows[0], fresh];
    const after = rowsAfterSkip(shown, shown[0].issue.id, read, { leftOut: [issueRows[0].issue.id] });
    expect(after[0].issue.id).toBe('fresh001');
  });
});

describe('empty ends', () => {
  it('is none while the list has rows', () => {
    expect(issuesEndOf(ISSUES_VIEW, personalList())).toBeNull();
  });

  it('says issues wait outside "For you", with the switch to turn off and the email', () => {
    expect(issuesEndOf(ISSUES_VIEW, listOutsideForYou())).toEqual({
      title: 'No open issue for you right now',
      text: 'An issue shows here when it is in one of your languages and uses a lesson at your level or one above. We look for new ones every day. 26 open issues are outside your languages or level.',
      turnOff: { label: 'Turn off “For you”', href: '/learn/issues?for-you=0' },
      email: true,
    });
    expect(issuesEndOf(ISSUES_VIEW, listOutsideForYou({ outsideForYou: 1 }))?.text).toContain(
      'One open issue is outside your languages or level.',
    );
  });

  it("offers no email on a lesson's, a course's or a language's end", () => {
    expect(issuesEndOf(views.lesson, listOutsideForYou(), 'lesson')).toEqual({
      title: 'No issue matches',
      text: 'There is no open issue for this lesson in your languages and at your level right now. 26 open issues are outside them.',
      turnOff: {
        label: 'Turn off “For you”',
        href: '/learn/lessons/find-duplicates-with-a-set/real-world?for-you=0',
      },
      email: false,
    });
    expect(issuesEndOf(views.language, listNone())).toMatchObject({
      text: 'There is no open issue in Go right now. We look for new ones every day.',
      turnOff: null,
      email: false,
    });
  });

  it('says there is none at all, with the email, and "Turn off “Lessons I learned”" when issues wait behind it', () => {
    expect(issuesEndOf(ISSUES_VIEW, listNone())).toEqual({
      title: 'No open issue right now',
      text: 'We look for new ones every day.',
      turnOff: null,
      email: true,
    });
    expect(issuesEndOf(views.learned, listNone({ learnedCount: 40 }))).toEqual({
      title: 'No open issue uses a lesson you learned right now',
      text: 'We look for new ones every day.',
      turnOff: { label: 'Turn off “Lessons I learned”', href: '/learn/issues' },
      email: true,
    });
    expect(issuesEndOf(views.course, listNone(), 'course')?.text).toBe(
      'There is no open issue in this course that uses a lesson you learned right now. We look for new ones every day.',
    );
  });

  it('never offers "For you" when it is off, whatever the API says waits outside it', () => {
    expect(issuesEndOf({ ...ISSUES_VIEW, forYou: false }, listOutsideForYou())?.turnOff).toBeNull();
  });

  it("says a visitor's empty view plainly", () => {
    expect(visitorEndOf(ISSUES_VIEW).title).toBe('No open issue right now');
    expect(visitorEndOf(views.course).text).toBe(
      'There is no open issue in this course right now. We look for new ones every day.',
    );
  });
});

describe('"Email me when one appears"', () => {
  it('covers the list the switches show', () => {
    expect(emailCoverOf(ISSUES_VIEW)).toBe('FOR_YOU');
    expect(emailCoverOf(views.learned)).toBe('LEARNED');
  });

  it('is off, on with its address, or on with no address', () => {
    expect(issuesEmailStateOf({ emailOn: false, emailTo: 'y***@example.com' })).toEqual({ kind: 'off' });
    expect(issuesEmailStateOf({ emailOn: true, emailTo: 'y***@example.com' })).toEqual({
      kind: 'on',
      to: 'y***@example.com',
    });
    expect(issuesEmailStateOf({ emailOn: true, emailTo: null })).toEqual({ kind: 'no-address' });
    expect(emailOnLineOf('y***@example.com')).toBe('We’ll email you at y***@example.com when one appears.');
  });
});

describe("the API's answers checked", () => {
  it('reads a row, leaving out one without its masked issue', () => {
    expect(issuesRowOf(issueRows[0])).toEqual(issueRows[0]);
    expect(issuesRowOf({ ...issueRows[0], issue: null })).toBeNull();
    expect(issuesRowOf(null)).toBeNull();
    // A lesson line without a lesson is no line.
    expect(issuesRowOf({ ...issueRows[0], lesson: null })?.why).toBe('NO_LESSON');
    expect(issuesRowOf({ ...issueRows[0], why: 'SOMETHING_NEW' })?.why).toBe('NO_LESSON');
  });

  it("reads the person's list, a zero count as none", () => {
    expect(issuesListOf(personalList())).toEqual(personalList());
    expect(
      issuesListOf({ rows: [null, issueRows[0]], forYouCount: 0, emptyEnd: 'ELSE', emailOn: 'yes', emailTo: '' }),
    ).toEqual({
      rows: [issueRows[0]],
      forYouCount: null,
      learnedCount: null,
      emptyEnd: null,
      outsideForYou: null,
      emailOn: false,
      emailTo: null,
    });
    expect(issuesListOf(null)).toBeNull();
    expect(issuesListOf({ rows: null })).toBeNull();
  });

  it("reads a visitor's list", () => {
    expect(issuesListPublicOf({ rows: issueRows })).toEqual({ rows: issueRows });
    expect(issuesListPublicOf({})).toBeNull();
  });

  it('says the day a fix was merged, in UTC', () => {
    expect(mergedOnOf('2026-11-18T23:30:00.000Z')).toBe('merged 18 Nov');
    expect(mergedOnOf(null)).toBeNull();
    expect(mergedOnOf('not a date')).toBeNull();
  });
});

describe("a project's issues", () => {
  it('reads a repository or an organisation from the address, in lower case, and never both', () => {
    expect(issuesViewOf({ repo: 'Django/Django' })).toEqual({ ...ISSUES_VIEW, repo: 'django/django' });
    expect(issuesViewOf({ org: 'Kubernetes', fixed: '1' })).toEqual({
      ...ISSUES_VIEW,
      org: 'kubernetes',
      show: 'fixed',
    });
    expect(issuesViewOf({ repo: 'django/django', org: 'kubernetes' })).toEqual({
      ...ISSUES_VIEW,
      repo: 'django/django',
    });
    for (const query of [{ repo: 'django' }, { repo: 'a/b/c' }, { repo: 'a/..' }, { org: 'a_b' }, { org: '-x' }]) {
      expect(issuesViewOf(query), JSON.stringify(query)).toEqual(ISSUES_VIEW);
    }
  });

  it('writes a repository with its slash, as every link to it does', () => {
    expect(issuesHrefOf(views.repo)).toBe('/learn/issues?repo=django/django');
    expect(issuesHrefOf(views.orgFixed)).toBe('/learn/issues?org=kubernetes&fixed=1');
    expect(issuesMarkdownPathOf(views.repo)).toBe('/learn/issues.md?repo=django/django');
    expect(issuesPublicInputOf(views.orgFixed)).toEqual({
      lesson: null,
      course: null,
      language: null,
      repo: null,
      org: 'kubernetes',
    });
  });

  it('shows the narrowing as a chip, and "Clear filters" drops it', () => {
    expect(issuesChipsOf(views.repo)).toEqual([
      { key: 'repo', label: 'Repository: django/django', removeHref: '/learn/issues' },
    ]);
    expect(issuesChipsOf(views.orgFixed).map(({ key, label, removeHref }) => [key, label, removeHref])).toEqual([
      ['org', 'Org: kubernetes', '/learn/issues?fixed=1'],
      ['fixed', 'Fixed', '/learn/issues?org=kubernetes'],
    ]);
    expect(unchippedOf(views.repo)).toEqual(ISSUES_VIEW);
  });

  it("says what a project's view narrows to when it has no issue", () => {
    expect(visitorEndOf(views.repo).text).toBe(
      'There is no open issue in this project right now. We look for new ones every day.',
    );
    expect(visitorEndOf({ ...ISSUES_VIEW, org: 'kubernetes' }).text).toBe(
      'There is no open issue in the projects of this org right now. We look for new ones every day.',
    );
  });

  it('sends `show=fixed` to the fixed view at its one address', () => {
    expect(issuesShowFixedRedirectOf('/learn/issues', '?show=fixed')).toBe('/learn/issues?fixed=1');
    expect(issuesShowFixedRedirectOf('/learn/issues', '?repo=django/django&show=fixed')).toBe(
      '/learn/issues?repo=django/django&fixed=1',
    );
    expect(issuesShowFixedRedirectOf('/learn/issues', '?show=open')).toBeNull();
    expect(issuesShowFixedRedirectOf('/learn/issues', '')).toBeNull();
    expect(issuesShowFixedRedirectOf('/learn/issues.md', '?show=fixed')).toBeNull();
  });
});
