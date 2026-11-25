import { describe, expect, it } from 'vitest';

import {
  GITHUB_ACCESS_PATH,
  isByAttemptPath,
  isFairUseAnswerPath,
  isInsidePath,
  isMyPath,
  isTablessPath,
  isWorkspacePath,
  KEY_REPLACE_PATH,
  learnIssuesPathOf,
  learnIssuesViewOf,
  movedAnchorOf,
  PICK_ISSUE_PATHS,
  pullRequestByAttemptPath,
  pullRequestPath,
  SETTINGS_PATHS,
  settingsPathOf,
  settingUpHomeOf,
  switchPathOf,
  WORKSPACE_ANCHORS,
  WORKSPACE_PATHS,
} from './paths';
import { issuesQueryOf } from '@/app/contribute/components/issues-filter';
import { issuesHrefOf, issuesViewOf } from '@/lib/learn/issues';
import { LEARN_ISSUES_PATH } from '@/lib/learn/paths';
import { issuePageCarriedOf } from '@/lib/workspace/masked-issue';

describe('the workspace addresses', () => {
  it('are under /my, but for the two front tabs and the Learn pages that keep theirs until their own are built', () => {
    expect(WORKSPACE_PATHS).toEqual({
      contribute: '/contribute',
      learnHome: '/learn',
      pullRequests: '/my/pull-requests',
      agent: '/my/agent',
      agentConnect: '/my/agent/connect',
      agentKey: '/my/agent/key',
      agentModel: '/my/agent/model',
      agentBudget: '/my/agent/budget',
      agentRuns: '/my/agent/runs',
      settings: '/my/settings',
      settingsGithub: '/my/settings/github',
      settingsPullRequests: '/my/settings/pull-requests',
      settingsWork: '/my/settings/work',
    });
  });

  it('are the ones the older names give', () => {
    expect(SETTINGS_PATHS).toEqual({
      summary: '/my/settings',
      github: '/my/settings/github',
      pullRequests: '/my/settings/pull-requests',
      work: '/my/settings/work',
      budget: '/my/agent/budget',
      agent: '/my/agent/model',
      keys: '/my/agent/key',
      ownAgent: '/my/agent',
    });
    expect(WORKSPACE_PATHS.agentRuns).toBe('/my/agent/runs');
    expect(WORKSPACE_PATHS.agentConnect).toBe('/my/agent/connect');
    expect(WORKSPACE_PATHS.agentKey).toBe('/my/agent/key');
    expect(switchPathOf('STACK')).toBe('/my/settings/work/switch/stack');
  });

  it('name the rows other pages link to where they are', () => {
    expect(WORKSPACE_ANCHORS).toEqual({
      limitRow: '/my/settings/pull-requests#open',
      attemptsRow: '/my/settings/pull-requests#attempts',
      work: '/my/settings/work#work',
      agentKey: '/my/agent/key',
      agentBudget: '/my/agent/budget',
    });
    expect(GITHUB_ACCESS_PATH).toBe('/my/settings/github');
    expect(KEY_REPLACE_PATH).toBe('/my/agent/key?replace=1');
  });

  it("send an old Settings anchor to the page it is on now; the summary's own stay", () => {
    expect(movedAnchorOf('limits')).toBe('/my/agent/budget');
    expect(movedAnchorOf('pacing')).toBe('/my/agent/budget#pacing');
    expect(movedAnchorOf('more-limits')).toBe('/my/agent/budget#more-limits');
    expect(movedAnchorOf('agent')).toBe('/my/agent/model');
    expect(movedAnchorOf('prs')).toBe('/my/settings/pull-requests');
    expect(movedAnchorOf('github')).toBe('/my/settings/github');
    expect(movedAnchorOf('access')).toBe('/my/agent/key');
    expect(movedAnchorOf('own-agent')).toBe('/my/agent#own-agent');
    expect(movedAnchorOf('pause')).toBe('/my/agent#hosted-level');
    expect(movedAnchorOf('autopilot')).toBe('/my/agent#autopilot');
    for (const anchor of ['modes', 'work', 'ignored', 'rules']) {
      expect(movedAnchorOf(anchor)).toBe(`/my/settings/work#${anchor}`);
    }
    for (const anchor of ['email', 'danger', 'toString']) expect(movedAnchorOf(anchor)).toBeNull();
    expect(settingsPathOf('work')).toBe('/my/settings/work#work');
    expect(settingsPathOf('email')).toBe('/my/settings#email');
  });
});

describe('which pages are which', () => {
  it('takes /my and everything under it as the workspace, in the spellings the router reads', () => {
    for (const path of ['/my', '/my/', '/MY/settings', '//my//agent', '/%6Dy/pull-requests', '/my%']) {
      expect(isMyPath(path), path).toBe(true);
    }
    for (const path of ['/', '/myself', '/mystery/x', '/profile/my', '/contribute/my']) {
      expect(isMyPath(path), path).toBe(false);
    }
  });

  it('is inside for Contribute and /my, not for Learn; the workspace for all three', () => {
    for (const path of ['/contribute', '/contribute/issues', '/my/agent']) expect(isInsidePath(path), path).toBe(true);
    for (const path of ['/learn', '/learn/start/a/b/1', '/', '/profile/x']) {
      expect(isInsidePath(path), path).toBe(false);
    }
    for (const path of ['/contribute', '/learn', '/learn/lessons', '/my/settings']) {
      expect(isWorkspacePath(path), path).toBe(true);
    }
    for (const path of ['/', '/learning', '/profile/x']) expect(isWorkspacePath(path), path).toBe(false);
  });

  it('shows no tabs on the pages about Contribute and Learn', () => {
    for (const path of [
      '/contribute/maintainers',
      '/contribute/maintainers/report',
      '/contribute/ledger',
      '/contribute/mcp',
      '/contribute/faq',
      '/contribute/authorize',
      '/contribute/start',
      '/contribute/start/agent/own',
      '/learn/about',
      '/learn/lessons/a-lesson-1x',
      '/learn/lessons/a-lesson-1x/passes/octocat',
    ]) {
      expect(isTablessPath(path), path).toBe(true);
    }
    for (const path of ['/contribute', '/contribute/issues', '/learn', '/learn/lessons', '/my/settings/goal', '/my']) {
      expect(isTablessPath(path), path).toBe(false);
    }
  });

  it("sends an account being set up to Contribute's home, carrying the connect step it was on", () => {
    const at = (path: string) => settingUpHomeOf(new URL(path, 'https://gitranks.com'));
    expect(at('/my/agent/connect')).toBe('/contribute/start/agent/own');
    expect(at('/my/agent/connect/?proof=A_1')).toBe('/contribute/start/agent/own?proof=A_1');
    expect(at('/my/agent/connect?from=agent')).toBe('/contribute/start/agent/own?from=agent');
    expect(at('/my/agent/key')).toBe('/contribute/start/agent/key');
    for (const path of ['/my/agent', '/my/settings', '/my/pull-requests', '/contribute/issues', '/my/issues/a/b']) {
      expect(at(path), path).toBe('/contribute');
    }
  });

  it("carries the page of one issue in the home's query, with where the person came from and their press", () => {
    const at = (path: string) => settingUpHomeOf(new URL(path, 'https://gitranks.com'));
    expect(at('/my/issues/q7k2m9xa?from=learn&look=1')).toBe('/contribute?issue=q7k2m9xa&from=learn&look=1');
    expect(at('/my/issues/q7k2m9xa/')).toBe('/contribute?issue=q7k2m9xa');
    expect(at('/my/issues/q7k2m9xa?from=elsewhere&look=yes')).toBe('/contribute?issue=q7k2m9xa');
  });

  it("carries a Learn view's filters through the setup as one value, which the home's own filters never read", () => {
    const at = (path: string) => settingUpHomeOf(new URL(path, 'https://gitranks.com'));
    const home = at('/my/issues/q7k2m9xa?from=learn&course=algorithms&language=go&at=course&next=x&look=1');
    expect(home).toBe(
      '/contribute?issue=q7k2m9xa&from=learn&view=course%3Dalgorithms%26language%3Dgo%26at%3Dcourse&look=1',
    );
    const query = new URL(home, 'https://gitranks.com').searchParams;
    expect(query.get('language')).toBeNull();
    expect(issuesQueryOf(Object.fromEntries(query))).toEqual({});
    expect(issuePageCarriedOf(Object.fromEntries(query))).toBe(
      '/my/issues/q7k2m9xa?from=learn&course=algorithms&language=go&at=course&look=1',
    );
    // Only from Learn, and only a view's own filters.
    expect(at('/my/issues/q7k2m9xa?from=contribute&language=go')).toBe('/contribute?issue=q7k2m9xa&from=contribute');
    expect(at('/my/issues/q7k2m9xa?from=learn&next=%2F%2Fevil.example')).toBe('/contribute?issue=q7k2m9xa&from=learn');
  });
});

describe("one attempt's page, by its id", () => {
  it('is the address by attempt, which finds the attempt and goes on to its page', () => {
    expect(pullRequestByAttemptPath('A_1')).toBe('/my/pull-requests/by-attempt/A_1');
    expect(pullRequestByAttemptPath('a/b')).toBe('/my/pull-requests/by-attempt/a%2Fb');
  });

  it("asks for a Learn attempt's lesson with view=lesson", () => {
    expect(pullRequestByAttemptPath('A_1', { view: 'lesson' })).toBe('/my/pull-requests/by-attempt/A_1?view=lesson');
  });

  it('keeps the query it is given', () => {
    expect(pullRequestByAttemptPath('A_1', { query: { session: 'next' } })).toBe(
      '/my/pull-requests/by-attempt/A_1?session=next',
    );
    expect(pullRequestByAttemptPath('A_1', { query: { resume: 'n 1', move: 'x' } })).toBe(
      '/my/pull-requests/by-attempt/A_1?resume=n+1&move=x',
    );
    expect(pullRequestByAttemptPath('A_1', { query: {} })).toBe('/my/pull-requests/by-attempt/A_1');
  });
});

describe("the pull request's page, by repo and issue", () => {
  it('names the issue, an earlier attempt on it, a run and the next step', () => {
    const ref = { repo: 'acme/widgets', issue: 42 };
    expect(pullRequestPath(ref)).toBe('/my/pull-requests/acme/widgets/42');
    expect(pullRequestPath(ref, 'next')).toBe('/my/pull-requests/acme/widgets/42?session=next');
    expect(pullRequestPath(ref, { run: 'A_F2' })).toBe('/my/pull-requests/acme/widgets/42/runs/A_F2');
    expect(pullRequestPath({ ...ref, earlier: 'A_0' })).toBe('/my/pull-requests/acme/widgets/42/earlier/A_0');
    expect(pullRequestPath({ ...ref, earlier: 'A_0' }, { run: 'A_F1' })).toBe(
      '/my/pull-requests/acme/widgets/42/earlier/A_0/runs/A_F1',
    );
    expect(pullRequestPath({ ...ref, earlier: null }, 'next')).toBe('/my/pull-requests/acme/widgets/42?session=next');
    // GitHub's names need no escaping, but nothing else reaches the path unescaped.
    expect(pullRequestPath({ repo: 'a.b/c_d-e', issue: 1 }, { run: 'x/y' })).toBe(
      '/my/pull-requests/a.b/c_d-e/1/runs/x%2Fy',
    );
  });

  it('knows the address by attempt in any spelling, and nothing under it', () => {
    for (const path of [
      '/my/pull-requests/by-attempt/A_1',
      '/my/pull-requests/by-attempt/A_1/',
      '/MY//Pull-Requests/By-Attempt/A_1',
    ]) {
      expect(isByAttemptPath(path), path).toBe(true);
    }
    for (const path of [
      '/my/pull-requests/by-attempt',
      '/my/pull-requests/by-attempt/A_1/x',
      '/my/pull-requests/acme/w/1',
      // A malformed id names no attempt: the route answers its 404 to anyone.
      '/my/pull-requests/by-attempt/a.b',
      `/my/pull-requests/by-attempt/${'x'.repeat(65)}`,
    ]) {
      expect(isByAttemptPath(path), path).toBe(false);
    }
  });

  it("knows a fair-use message's answer page in any spelling, and nothing else of Contribute", () => {
    for (const path of ['/contribute/answer/583231-outsidePr-1-1', '/Contribute//Answer/a%2Fb%3D-viewing-2-7']) {
      expect(isFairUseAnswerPath(path), path).toBe(true);
    }
    for (const path of [
      '/contribute/answer',
      '/contribute/answer/',
      '/contribute/answers/x',
      '/contribute',
      '/my/answer/x',
    ]) {
      expect(isFairUseAnswerPath(path), path).toBe(false);
    }
  });

  it("picks another issue on the attempt's side: Contribute's issues, or Learn's own Issues page", () => {
    expect(PICK_ISSUE_PATHS).toEqual({ fix: '/contribute#issues', learn: '/learn/issues' });
    expect(PICK_ISSUE_PATHS.learn).toBe(LEARN_ISSUES_PATH);
  });

  it("keeps the filters of Learn's Issues page, each of its own shape, in Learn's order, and nothing else", () => {
    const view = (search: string) => learnIssuesViewOf(new URLSearchParams(search)).toString();
    expect(view('learned=1&for-you=0&fixed=1&language=go&lesson=a-queue&course=data-structures')).toBe(
      'course=data-structures&lesson=a-queue&language=go&fixed=1&for-you=0&learned=1',
    );
    expect(view('from=learn&look=1&next=%2F%2Fevil.example&repo=..%2Fb&org=-bad-')).toBe('');
    // A project's view: a repository as `owner/name`, an organisation as its login.
    expect(view('fixed=1&repo=django%2Fdjango')).toBe('repo=django%2Fdjango&fixed=1');
    expect(view('org=django&course=algorithms')).toBe('course=algorithms&org=django');
    expect(view('repo=a%2F..')).toBe('');
    expect(view('lesson=../x&course=Data%20Structures&language=c%2B%2B&fixed=yes&for-you=1&learned=0')).toBe('');
    expect(view(`lesson=${'a'.repeat(101)}`)).toBe('');
    // The page the view was on: a lesson's or a course's own, only with the lesson or the course it names.
    expect(view('at=lesson&lesson=a-queue&learned=1')).toBe('lesson=a-queue&learned=1&at=lesson');
    expect(view('at=course&course=algorithms')).toBe('course=algorithms&at=course');
    expect(view('at=lesson&course=algorithms')).toBe('course=algorithms');
    expect(view('at=https://evil.example&lesson=a-queue')).toBe('lesson=a-queue');
    expect(view('at=issues')).toBe('');
  });

  it("writes Learn's Issues page under those filters as Learn writes the same view", () => {
    for (const search of ['', 'lesson=a-queue', 'course=data-structures&language=python&for-you=0', 'learned=1']) {
      expect(learnIssuesPathOf(new URLSearchParams(search)), search).toBe(
        issuesHrefOf(issuesViewOf(Object.fromEntries(new URLSearchParams(search)))),
      );
    }
    expect(learnIssuesPathOf(new URLSearchParams('from=learn&next=https://evil.example'))).toBe('/learn/issues');
  });

  it("writes a lesson's or a course's own view of Issues at its own address, as Learn writes it", () => {
    const cases = [
      ['at=lesson&lesson=a-queue', 'lesson'],
      ['at=lesson&lesson=a-queue&course=algorithms&for-you=0', 'lesson'],
      ['at=course&course=algorithms&learned=1', 'course'],
      ['at=course&course=algorithms&lesson=a-queue&language=go', 'course'],
    ] as const;
    for (const [search, at] of cases) {
      const query = new URLSearchParams(search);
      const own = { [at]: query.get(at) ?? undefined };
      expect(learnIssuesPathOf(query), search).toBe(issuesHrefOf(issuesViewOf(Object.fromEntries(query), own), at));
    }
    // The view's groups are carried: open issues alone, or fixes alone.
    expect(learnIssuesPathOf(new URLSearchParams('at=lesson&lesson=a-queue&open=1'))).toBe(
      '/learn/lessons/a-queue/real-world?open=1',
    );
    expect(learnIssuesPathOf(new URLSearchParams('at=course&course=algorithms&fixed=1'))).toBe(
      '/learn/courses/algorithms/real-world?fixed=1',
    );
    expect(learnIssuesPathOf(new URLSearchParams('at=course&course=algorithms&open=2'))).toBe(
      '/learn/courses/algorithms/real-world',
    );
    expect(learnIssuesPathOf(new URLSearchParams('at=lesson&lesson=a-queue'))).toBe(
      '/learn/lessons/a-queue/real-world',
    );
    // Without the lesson or the course it names, Issues' own page; never anywhere but Learn's.
    expect(learnIssuesPathOf(new URLSearchParams('at=course&lesson=a-queue'))).toBe('/learn/issues?lesson=a-queue');
    for (const search of ['at=lesson&lesson=..%2F..%2Fmy', 'at=%2F%2Fevil.example&course=x', 'at=lesson']) {
      expect(learnIssuesPathOf(new URLSearchParams(search)), search).toMatch(
        /^\/learn\/(?:issues|lessons|courses)(?:[/?]|$)/,
      );
    }
  });
});
