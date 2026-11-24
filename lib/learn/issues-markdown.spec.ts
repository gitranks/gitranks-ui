import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { issueRows, issuesNames, views } from './__fixtures__/issues';
import { ISSUES_VIEW } from './issues';
import { learnIssuesMarkdownOf, learnIssuesMarkdownResponse, markdownViewOf } from './issues-markdown';

const query = (search: string) => new URLSearchParams(search);

describe("Issues' Markdown copies", () => {
  it('reads the view and the page from the query, the switches and "Fixed" left as they are by default', () => {
    expect(markdownViewOf(query('language=Go&for-you=0&learned=1&fixed=1'))).toEqual({
      view: { ...ISSUES_VIEW, language: 'go' },
      at: 'issues',
    });
    expect(markdownViewOf(query('lesson=binary-search&at=lesson'))).toEqual({
      view: { ...ISSUES_VIEW, lesson: 'binary-search' },
      at: 'lesson',
    });
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
    expect(copy).toContain('/my/issues/q7k2m9xa');
    // A visitor's copy: every lesson is taught, none "learned"; a row without a lesson has no lesson line.
    expect(copy).not.toContain('learned');
    expect(copy.match(/^- \*\*/gm)).toHaveLength(5);
    expect(copy.split('\n').find((line) => line.includes('A date typed as text'))).not.toContain('Teaches');
    expect(copy).toMatch(/The page: \S*\/learn\/issues\n$/);
    expect(copy).not.toContain('—');
  });

  it("names a lesson's or a course's view, and its chips", () => {
    const lesson = learnIssuesMarkdownOf(views.lesson, [], { at: 'lesson', names: issuesNames });
    expect(lesson).toMatch(/^# Find duplicates in one pass with a set in the real world\n/);
    expect(lesson).toContain('View: Lesson: Find duplicates in one pass with a set.');
    expect(lesson).toContain('No open issue right now. We look for new ones every day.');
    expect(lesson).toContain('/learn/lessons/find-duplicates-with-a-set/real-world\n');
    const language = learnIssuesMarkdownOf(views.language, null);
    expect(language).toContain('View: Language: Go.');
    expect(language).toContain('The list of real issues to learn from is not available right now.');
  });

  it('is not found while Learn is not open to everyone, without reading the list', async () => {
    const read = vi.fn();
    const closed = await learnIssuesMarkdownResponse(async () => false, read, ISSUES_VIEW, 'issues');
    expect(closed.status).toBe(404);
    expect(closed.headers.get('cache-control')).toBe('private, no-store');
    const failed = await learnIssuesMarkdownResponse(
      () => Promise.reject(new Error('down')),
      read,
      ISSUES_VIEW,
      'issues',
    );
    expect(failed.status).toBe(404);
    expect(read).not.toHaveBeenCalled();
  });

  it("is the copy once open, and not found for a lesson's or a course's view of no known name", async () => {
    const open = async () => true;
    const ok = await learnIssuesMarkdownResponse(
      open,
      async () => ({ rows: issueRows, names: {} }),
      ISSUES_VIEW,
      'issues',
    );
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(ok.headers.get('link')).toBe('</learn/issues>; rel="canonical"');
    const missing = await learnIssuesMarkdownResponse(
      open,
      async () => ({ rows: [], names: { lesson: null } }),
      views.lesson,
      'lesson',
    );
    expect(missing.status).toBe(404);
  });
});
