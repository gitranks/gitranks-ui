import { describe, expect, it } from 'vitest';

import { fixPageUrlOf, pullRequestLinksOf } from './page-links';
import { prPage } from '@/lib/workspace/__fixtures__/pull-request';

const BASE = '/my/pull-requests/acme/widgets/42';
const learn = (patch: Parameters<typeof prPage>[0] = {}) =>
  prPage({ made: 'LEARN', repo: 'acme/widgets', issueNumber: 42, ...patch });
const contribute = (patch: Parameters<typeof prPage>[0] = {}) =>
  prPage({ made: 'CONTRIBUTE', repo: 'acme/widgets', issueNumber: 42, waysOn: null, ...patch });

describe("a pull request page's links", () => {
  it('leads back to the list of its own product, and to the walkthrough and Approve of the newest fix', () => {
    const before = pullRequestLinksOf(learn({ number: null, url: null, box: 'WALKTHROUGH' }), {
      latest: true,
      login: 'octocat',
    });
    expect(before).toMatchObject({
      back: '/my/pull-requests?from=learn',
      walkthrough: `${BASE}/walkthrough`,
      approve: `${BASE}/approve`,
      answers: `${BASE}/walkthrough`,
      issues: '/learn/issues',
    });
    expect(pullRequestLinksOf(contribute(), { latest: true, login: 'octocat' })).toMatchObject({
      back: '/my/pull-requests',
      walkthrough: null,
      answers: null,
      issues: '/contribute#issues',
    });
    // An earlier attempt has no walkthrough or Approve of its own.
    expect(pullRequestLinksOf(learn({ number: null }), { latest: false, login: 'octocat' })).toMatchObject({
      walkthrough: null,
      approve: null,
      answers: null,
    });
  });

  it('reads the change on Approve before the pull request, on GitHub after', () => {
    const approving = learn({ number: null, url: null, box: 'APPROVE' });
    expect(pullRequestLinksOf(approving, { latest: true, login: null }).change).toBe(`${BASE}/approve`);
    const open = learn({ number: 57, url: 'https://github.com/acme/widgets/pull/57', box: 'OPEN' });
    const links = pullRequestLinksOf(open, { latest: true, login: 'octocat' });
    expect(links.change).toBe('https://github.com/acme/widgets/pull/57/files');
    // Open: the person's answers are on the fix's public page.
    expect(links.answers).toBe('/learn/fixes/acme/widgets/57/walkthrough/by/octocat');
    expect(links.walkthrough).toBeNull();
  });

  it("takes the ways on from the API only when they are this site's own paths", () => {
    const page = learn({
      waysOn: { lessonQuestions: '/learn/lessons/go-retries', lessonIssues: 'https://elsewhere.example', course: null },
    });
    expect(pullRequestLinksOf(page, { latest: true, login: null })).toMatchObject({
      lessonQuestions: '/learn/lessons/go-retries',
      lessonIssues: null,
      course: null,
    });
  });

  it("gives the fix's public page to copy once its Learn pull request is open, never before", () => {
    expect(fixPageUrlOf(learn({ number: 57, box: 'OPEN' }), 'https://gitranks.com')).toBe(
      'https://gitranks.com/learn/fixes/acme/widgets/57',
    );
    expect(fixPageUrlOf(learn({ number: null, box: 'APPROVE' }), 'https://gitranks.com')).toBeNull();
    expect(fixPageUrlOf(contribute({ number: 57, box: 'OPEN' }), 'https://gitranks.com')).toBeNull();
  });
});
