import { print } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
const content = vi.hoisted(() => ({ loadLearnLessonPage: vi.fn(), loadLearnCourse: vi.fn() }));
vi.mock('./lesson-page.data', () => ({ loadLearnLessonPage: content.loadLearnLessonPage }));
vi.mock('./course.data', () => ({ loadLearnCourse: content.loadLearnCourse }));

const { issuesNamesOf, loadIssuesList, loadIssuesListPublic, loadLearnFixes } = await import('./issues.data');
const { ISSUES_VIEW } = await import('./issues');
const { issueRows, learnFixes, personalList, views } = await import('./__fixtures__/issues');

/** The API's answer to a field it does not know yet, as it throws it. */
const unknownField = (field: string) =>
  new Error(
    JSON.stringify([
      { message: `Cannot query field "${field}" on type "Query".`, extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } },
    ]),
  );

describe("Issues' reads", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
  });

  it("reads a visitor's five with no session, by the view's chips alone", async () => {
    graphqlDirect.mockResolvedValueOnce({ list: { rows: issueRows } });
    expect(await loadIssuesListPublic({ ...views.course, forYou: false })).toEqual({
      kind: 'ok',
      data: { rows: issueRows },
    });
    const [document, variables, options] = graphqlDirect.mock.calls[0];
    expect(print(document)).toContain('learnQueuePublic(input: $input)');
    expect(variables).toEqual({ input: { lesson: null, course: 'algorithms', language: null } });
    expect(options).toEqual({ source: 'ssr' });
  });

  it("reads the person's five as the Issues page, with the switches", async () => {
    graphqlDirect.mockResolvedValueOnce({ list: personalList() });
    expect(await loadIssuesList('octocat', views.learned)).toEqual({ kind: 'ok', data: personalList() });
    const [document, variables, options] = graphqlDirect.mock.calls[0];
    expect(print(document)).toContain('learnQueue(input: $input, issuesPage: $issuesPage)');
    expect(variables).toEqual({
      input: { lesson: null, course: null, language: null, forYou: true, learned: true },
      issuesPage: true,
    });
    expect(options).toEqual({ source: 'ssr', githubLogin: 'octocat' });
  });

  it('answers unavailable for an API that does not know the reads yet, or answers none, and failed otherwise', async () => {
    graphqlDirect.mockRejectedValueOnce(unknownField('learnQueuePublic'));
    expect(await loadIssuesListPublic(ISSUES_VIEW)).toEqual({ kind: 'unavailable' });
    graphqlDirect.mockRejectedValueOnce(unknownField('learnQueue'));
    expect(await loadIssuesList('octocat', ISSUES_VIEW)).toEqual({ kind: 'unavailable' });
    graphqlDirect.mockRejectedValueOnce(unknownField('learnFixes'));
    expect(await loadLearnFixes(views.courseFixed)).toEqual({ kind: 'unavailable' });

    graphqlDirect.mockResolvedValueOnce({ list: null });
    expect(await loadIssuesListPublic(ISSUES_VIEW)).toEqual({ kind: 'unavailable' });
    graphqlDirect.mockResolvedValueOnce({ list: null });
    expect(await loadIssuesList('octocat', ISSUES_VIEW)).toEqual({ kind: 'unavailable' });
    graphqlDirect.mockResolvedValueOnce({ learnFixes: null });
    expect(await loadLearnFixes(ISSUES_VIEW)).toEqual({ kind: 'unavailable' });

    graphqlDirect.mockRejectedValueOnce(new Error('socket hang up'));
    expect(await loadIssuesList('octocat', ISSUES_VIEW)).toEqual({ kind: 'failed' });
  });

  it('reads a page of merged fixes from its cursor', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnFixes });
    expect(await loadLearnFixes(views.courseFixed, 'cursor-2')).toEqual({ kind: 'ok', data: learnFixes });
    expect(graphqlDirect.mock.calls[0][1]).toEqual({
      input: { lesson: null, course: 'algorithms', language: null, after: 'cursor-2' },
    });
  });

  it('names the chips from the content, and none when it cannot be read', async () => {
    content.loadLearnLessonPage.mockResolvedValueOnce({ lesson: { title: 'Binary search' } });
    content.loadLearnCourse.mockRejectedValueOnce(new Error('down'));
    expect(await issuesNamesOf({ ...ISSUES_VIEW, lesson: 'binary-search', course: 'algorithms' })).toEqual({
      lesson: 'Binary search',
      course: null,
    });
    expect(await issuesNamesOf(ISSUES_VIEW)).toEqual({ lesson: null, course: null });
  });
});
