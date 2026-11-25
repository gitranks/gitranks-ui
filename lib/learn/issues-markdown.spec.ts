import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { issueRows, issuesNames, learnFixes, views } from './__fixtures__/issues';
import { ISSUES_VIEW } from './issues';
import { learnIssuesMarkdownOf, learnIssuesMarkdownResponse, markdownViewOf } from './issues-markdown';

const query = (search: string) => new URLSearchParams(search);

describe("Issues' Markdown copies", () => {
  it('reads the view and the page from the query, the switches and "Fixed" left as they are by default', () => {
    expect(markdownViewOf(query('language=Go&for-you=0&learned=1&fixed=1'))).toEqual({
      view: { ...ISSUES_VIEW, language: 'go' },
      at: 'issues',
    });
    // A lesson's or a course's own copy lists both groups, whatever the page shows.
    for (const search of ['lesson=binary-search&at=lesson', 'lesson=binary-search&at=lesson&open=1&fixed=1']) {
      expect(markdownViewOf(query(search)), search).toEqual({
        view: { ...ISSUES_VIEW, lesson: 'binary-search', show: 'both' },
        at: 'lesson',
      });
    }
    expect(markdownViewOf(query('course=algorithms&at=course')).at).toBe('course');
    expect(markdownViewOf(query('at=elsewhere')).at).toBe('issues');
  });

  it('lists the five masked, with what each teaches and where it is seen in full, never its project', () => {
    const copy = learnIssuesMarkdownOf(ISSUES_VIEW, issueRows);
    expect(copy).toMatch(/^# Real issues and fixes\n/);
    expect(copy).toContain(
      '- **Tags show twice in a sidebar after one of them is renamed** (TypeScript, small size, bug). Teaches [Find duplicates in one pass with a set](',
    );
    expect(copy).toContain('/learn/lessons/find-duplicates-with-a-set).');
    expect(copy).toContain('See it in full: ');
    expect(copy).toContain('/my/issues/q7k2m9xa?from=learn');
    // A visitor's copy: every lesson is taught, none "learned"; a row without a lesson has no lesson line.
    expect(copy).not.toContain('learned');
    expect(copy.match(/^- \*\*/gm)).toHaveLength(5);
    expect(copy.split('\n').find((line) => line.includes('A date typed as text'))).not.toContain('Teaches');
    expect(copy).toMatch(/The page: \S*\/learn\/issues\n$/);
    expect(copy).not.toContain('—');
  });

  it("names a view's chips, and says when its list is not available", () => {
    const language = learnIssuesMarkdownOf(views.language, null);
    expect(language).toMatch(/^# Real issues and fixes\n/);
    expect(language).toContain('View: Language: Go.');
    expect(language).toContain('The list of real issues to learn from is not available right now.');
  });

  it("titles a lesson's own copy as its page, and lists the open issues then the merged fixes", () => {
    const copy = learnIssuesMarkdownOf(views.lesson, issueRows, {
      at: 'lesson',
      names: issuesNames,
      fixes: learnFixes,
    });
    const lines = copy.split('\n');
    expect(lines.slice(0, 3)).toEqual([
      '# Find duplicates in one pass with a set: in real projects',
      '',
      'Open issues in real open-source projects that this lesson helps you fix, and merged fixes that used it.',
    ]);
    expect(lines.indexOf('## Open')).toBeGreaterThan(0);
    expect(lines.indexOf('## Fixed')).toBeGreaterThan(lines.indexOf('## Open'));
    // A row does not repeat the lesson the copy is about; still masked, and seen in full on its own page.
    expect(copy).not.toContain('Teaches');
    expect(copy).toContain('See it in full: ');
    expect(copy).toContain(
      '- **Webhook deliveries were processed twice** (harbor-kit/relay, issue #412, pull request #418, Go). Fixed by octocat, merged 18 Nov. The fix: ',
    );
    expect(copy).toContain('/learn/fixes/harbor-kit/relay/418 On GitHub: https://github.com/harbor-kit/relay/pull/418');
    // Two of twelve: the count, as the page words it.
    expect(copy).toContain('Showing 2 of 12 fixes.');
    expect(copy).toMatch(/The page: \S*\/learn\/lessons\/find-duplicates-with-a-set\/real-world\n$/);
    expect(copy).not.toContain('View:');
    expect(copy).not.toContain('\u2014');
  });

  it("says in each group's place that it holds nothing, in a course's words", () => {
    const copy = learnIssuesMarkdownOf({ ...views.course, show: 'both' }, [], {
      at: 'course',
      names: issuesNames,
      fixes: { rows: [], total: 0, next: null },
    });
    expect(copy).toMatch(/^# Algorithms and data structures: in real projects\n/);
    expect(copy).toContain('## Open\n\nNo open issue needs this course right now. New issues come in every day.\n');
    expect(copy).toContain(
      '## Fixed\n\nNo fix yet. When someone fixes a real issue with a lesson of this course and the fix is merged, it shows here.\n',
    );
    const unread = learnIssuesMarkdownOf(views.lesson, null, { at: 'lesson', names: issuesNames, fixes: null });
    expect(unread).toContain('## Open\n\nThe list of real issues to learn from is not available right now.');
    expect(unread).toContain('## Fixed\n\nThe merged fixes are not available right now.');
  });

  it("lists a course's rows with their lesson, and leaves the count out with ten or fewer fixes", () => {
    const copy = learnIssuesMarkdownOf({ ...views.course, show: 'both' }, issueRows, {
      at: 'course',
      names: issuesNames,
      fixes: { ...learnFixes, total: 2, next: null },
    });
    expect(copy).toContain('Teaches [Find duplicates in one pass with a set](');
    expect(copy).not.toContain('fixes.');
    expect(copy).toContain('(lumen-data/importer, issue #88, pull request #93, Python).');
  });

  it("is the copy, and not found for a lesson's or a course's view of no known name", async () => {
    const ok = await learnIssuesMarkdownResponse(async () => ({ rows: issueRows, names: {} }), ISSUES_VIEW, 'issues');
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(ok.headers.get('link')).toBe('</learn/issues>; rel="canonical"');
    const missing = await learnIssuesMarkdownResponse(
      async () => ({ rows: [], names: { lesson: null } }),
      views.lesson,
      'lesson',
    );
    expect(missing.status).toBe(404);
    const own = await learnIssuesMarkdownResponse(
      async () => ({ rows: [], names: issuesNames, fixes: learnFixes }),
      { ...views.lesson, language: 'go' },
      'lesson',
    );
    expect(own.headers.get('link')).toBe('</learn/lessons/find-duplicates-with-a-set/real-world>; rel="canonical"');
  });

  it('answers a failed read with 503, never kept, and the API answering none with the copy', async () => {
    const failed = await learnIssuesMarkdownResponse(
      async () => ({ rows: null, failed: true, names: {} }),
      ISSUES_VIEW,
      'issues',
    );
    expect(failed.status).toBe(503);
    expect(failed.headers.get('cache-control')).toBe('no-store');
    expect(await failed.text()).toBe('The issues didn’t load. Try again in a minute.\n');
    const none = await learnIssuesMarkdownResponse(
      async () => ({ rows: null, failed: false, names: {} }),
      ISSUES_VIEW,
      'issues',
    );
    expect(none.status).toBe(200);
    expect(none.headers.get('cache-control')).toBe('public, max-age=60, s-maxage=60');
    expect(await none.text()).toContain('The list of real issues to learn from is not available right now.');
  });
});
