import { describe, expect, it } from 'vitest';

import { issuesNames, views } from '../__fixtures__/issues';
import { ISSUES_VIEW } from '../issues';
import { learnIssuesMetadata } from './issues';

describe("Issues' metadata", () => {
  it('names Issues, points to the chips with the switches as they are by default, and offers the copy', () => {
    const metadata = learnIssuesMetadata({ ...views.language, forYou: false });
    expect(metadata.title).toBe('Real issues and fixes');
    expect(metadata.alternates?.canonical).toBe('/learn/issues?language=go');
    expect(metadata.alternates?.types).toEqual({ 'text/markdown': '/learn/issues.md?language=go' });
    expect(metadata.robots).toBeUndefined();
    // "Fixed" on Issues is a page of its own; the copy lists the open issues.
    const fixed = learnIssuesMetadata(views.courseFixed);
    expect(fixed.alternates?.canonical).toBe('/learn/issues?course=algorithms&fixed=1');
    expect(fixed.alternates?.types).toEqual({ 'text/markdown': '/learn/issues.md?course=algorithms' });
  });

  it("titles a lesson's own view after the lesson, and points every variant to its bare address", () => {
    for (const show of ['both', 'open', 'fixed'] as const) {
      const metadata = learnIssuesMetadata(
        { ...views.lesson, show, forYou: false, learned: true },
        { at: 'lesson', names: issuesNames, fixed: true },
      );
      expect(metadata.title).toBe('Find duplicates in one pass with a set: in real projects');
      expect(metadata.description).toBe(
        'Open issues in real open-source projects that this lesson helps you fix, and merged fixes that used it.',
      );
      expect(metadata.alternates?.canonical, show).toBe('/learn/lessons/find-duplicates-with-a-set/real-world');
      expect(metadata.alternates?.types).toEqual({
        'text/markdown': '/learn/lessons/find-duplicates-with-a-set/real-world.md',
      });
      expect(metadata.robots).toBeUndefined();
    }
    // Another chip too: the bare address.
    expect(
      learnIssuesMetadata({ ...views.lesson, language: 'go' }, { at: 'lesson', names: issuesNames }).alternates
        ?.canonical,
    ).toBe('/learn/lessons/find-duplicates-with-a-set/real-world');
  });

  it("titles a course's own view after the course, in its words", () => {
    const metadata = learnIssuesMetadata(views.course, { at: 'course', names: issuesNames, fixed: true });
    expect(metadata.title).toBe('Algorithms and data structures: in real projects');
    expect(metadata.description).toBe(
      'Open issues in real open-source projects that this course helps you fix, and merged fixes that used its lessons.',
    );
    expect(metadata.alternates?.canonical).toBe('/learn/courses/algorithms/real-world');
  });

  it('keeps search engines off an own view with no merged fix, its links still followed; kept when not known', () => {
    expect(learnIssuesMetadata(views.lesson, { at: 'lesson', names: issuesNames, fixed: false }).robots).toEqual({
      index: false,
      follow: true,
    });
    expect(learnIssuesMetadata(views.lesson, { at: 'lesson', names: issuesNames, fixed: null }).robots).toBeUndefined();
    // Off its own address the view is Issues', indexed as Issues is.
    const issues = learnIssuesMetadata({ ...ISSUES_VIEW, language: 'go' }, { at: 'lesson', fixed: false });
    expect(issues.title).toBe('Real issues and fixes');
    expect(issues.robots).toBeUndefined();
  });
});
