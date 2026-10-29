import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute/attempts/A_1',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/app/contribute/actions', () => ({}));
vi.mock('@/lib/contribute/contribute.data', () => ({
  loadContribute: vi.fn(),
  loadIssues: vi.fn(),
  loadAttempt: vi.fn(),
  loadAttempts: vi.fn(),
  loadContributions: vi.fn(),
}));

const { ReviewScreen } = await import('./review-view');
const { DiffViewer, LARGE_FILE_LINES, MAX_FILE_LINES, MAX_TOTAL_LINES } = await import('./diff-viewer');
const { ContributionsScreen } = await import('./contributions-view');
const { ReviewsReady } = await import('./reviews-ready');
const { contributeTabOf } = await import('./contribute-nav');
const { OverviewStatusView } = await import('./overview-status');
const { IssuesScreen } = await import('./issues-view');
const { NOW, views, settings } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { PATCH, attempt, attempts, contributions, detail, stopped } = await import(
  '@/lib/contribute/__fixtures__/contribute-attempts'
);
const { END_REASONS, LIVE_STATES } = await import('@/lib/contribute/attempt-format');

import type {
  ContributeAttemptDetail,
  ContributeAttemptEndReason,
  ContributeView,
} from '@/lib/contribute/contribute.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

const review = (item: ContributeAttemptDetail | undefined, view: ContributeView = views.active) =>
  renderToStaticMarkup(<ReviewScreen view={view} attempt={item} now={NOW} />);

describe('the diff viewer', () => {
  it('shows each file with its added and removed lines, and the totals', () => {
    const html = renderToStaticMarkup(<DiffViewer patch={PATCH} />);
    const plain = text(html);

    expect(html).toContain('data-file="src/router/layout-cache.ts"');
    expect(html).toContain('data-file="src/router/normalize-path.ts"');
    expect(html).toContain('data-file="test/layout-cache.spec.ts"');
    expect(plain).toContain('+8 −2 · 3 files');
    expect(plain).toContain('new');
    expect((html.match(/data-line="add"/g) ?? []).length).toBe(8);
    expect((html.match(/data-line="del"/g) ?? []).length).toBe(2);
    expect(plain).not.toContain('Subject:');
  });

  it('escapes everything in the patch: it is untrusted text', () => {
    const html = renderToStaticMarkup(
      <DiffViewer
        patch={`${PATCH}\ndiff --git a/<img src=x onerror=alert(1)>.ts b/<img src=x onerror=alert(1)>.ts\n`}
      />,
    );

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; friends');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;.ts');
  });

  it('collapses a large file and leaves the others open', () => {
    const many = Array.from({ length: LARGE_FILE_LINES + 5 }, (_, index) => `+line ${index}`).join('\n');
    const patch = `${PATCH}\ndiff --git a/big.json b/big.json\n--- a/big.json\n+++ b/big.json\n@@ -0,0 +1,${LARGE_FILE_LINES + 5} @@\n${many}\n`;
    const html = renderToStaticMarkup(<DiffViewer patch={patch} />);

    expect(html).toMatch(/<details data-file="big.json" data-large="true" data-truncated="false" class="[^"]*">/);
    expect(html).toMatch(/<details open="" data-file="src\/router\/layout-cache.ts" data-large="false"/);
    expect(text(html)).toContain(`${LARGE_FILE_LINES + 6} lines, collapsed`);
  });

  it('says when the diff is not available yet', () => {
    expect(text(renderToStaticMarkup(<DiffViewer patch={null} />))).toContain('The diff is not available yet.');
  });
});

describe('the review screen', () => {
  it('shows the result, risk notes, checks with reasons, tests, cost split, timeline and the diff', () => {
    const failing = detail({
      checks: [
        { name: 'SECRETS', passed: true, detail: null },
        { name: 'LOCKFILES', passed: false, detail: 'package-lock.json' },
      ],
    });
    const html = review(failing);
    const plain = text(html);

    expect(plain).toContain('Ready for your review');
    expect(plain).toContain('driftwood-js/driftwood · issue #871');
    expect(plain).toContain('Nested layouts re-render on every navigation');
    expect(plain).toContain('Layout lookups used the raw route path');
    expect(plain).toContain('Low risk');
    expect(plain).toContain('Worth a look normalizePath keeps the case');
    expect(html).toContain('data-check="SECRETS" data-passed="true"');
    expect(html).toContain('data-check="LOCKFILES" data-passed="false"');
    expect(plain).toContain('No unrelated lockfile changes package-lock.json');
    expect(plain).toContain('pnpm vitest run test/layout-cache.spec.ts ✓ passed');
    expect(plain).toContain('pnpm lint ✗ failed');
    expect(html).toContain('1 warning &lt;b&gt;here&lt;/b&gt;');
    expect(plain).toContain('$2.36 of your $5 limit');
    expect(plain).toContain('Go/no-go check $0.31');
    expect(plain).toContain('Fix (Sonnet 5.5) $1.90');
    expect(plain).toContain('Sandbox running time $0.15');
    expect(plain).toContain('Oct 28, 11:04 Waiting for your review');
    expect(plain).toContain('The agent started · claimed');
    expect(html).toContain('data-file="src/router/layout-cache.ts"');
    expect(plain).toContain('Install pnpm install');
  });

  it('pre-fills the pull request from the agent, without its footer, and previews the footer the API adds', () => {
    const html = review(attempts.review);
    const plain = text(html);

    expect(html).toContain('value="Nested layouts re-render on every navigation"');
    expect(html).toMatch(/<textarea[^>]*>Fixes #871\n\n## What changed\nNormalize the route path.<\/textarea>/);
    expect(html).not.toContain('reviewed by @someone');
    expect(html).toContain('data-pr-footer');
    expect(plain).toContain('🤖 Made with Claude via [gitranks.com](https://gitranks.com) · reviewed by @octocat');
    expect(plain).toContain('Submit pull request');
    expect(plain).toContain('Discard');
  });

  it('adds the issue link to the preview when the body does not close the issue', () => {
    const html = review(detail({ result: { ...attempts.review.result!, prBody: 'Just a change.' } }));

    expect(html).toMatch(/<pre[^>]*>Fixes #871\n\nJust a change.<\/pre>/);
  });

  it('asks for the DCO sign-off, says when the repo asks for it, and not under a standing consent', () => {
    expect(review(attempts.review)).toContain('data-dco="ask"');
    expect(review(attempts.review)).toContain('type="checkbox"');

    const asked = detail({ readiness: { ...attempts.review.readiness!, notes: 'Commits need Signed-off-by (DCO).' } });
    expect(review(asked)).toContain('data-dco="asked"');
    expect(text(review(asked))).toContain('This repo asks for a DCO sign-off.');

    const standing = {
      ...views.active,
      contributor: { ...views.active.contributor, settings: { ...settings, dco: 'STANDING' as const } },
    };
    const html = review(attempts.review, standing);
    expect(html).toContain('data-dco="standing"');
    expect(html).not.toContain('type="checkbox"');
  });

  it('asks to approve again after a submission bounced back, with its note and the edited text', () => {
    const html = review(attempts.bounced);
    const plain = text(html);

    expect(plain).toContain('Back for your approval');
    expect(html).toContain('data-submit-error="fork_timeout"');
    expect(plain).toContain('GitHub is still making your fork. Approve again in a few minutes.');
    expect(html).toContain('value="Normalize route paths"');
    expect(plain).toContain('Submit again');
  });

  it.each([
    ['queued', 'QUEUED', 'It starts when your limits allow the next attempt.'],
    ['running', 'RUNNING', 'The agent is working on it'],
    ['checks', 'CHECKS', 'Running our checks'],
    ['pendingAutosubmit', 'PENDING_AUTOSUBMIT', 'Autopilot submits this within the hour'],
    ['discarded', 'DISCARDED', 'You discarded it.'],
    ['expired', 'DISCARDED', 'It waited seven days for a review'],
  ] as const)('renders the %s state', (name, state, words) => {
    const html = review(attempts[name]);

    expect(html).toContain(`data-attempt-status="${state}"`);
    expect(text(html)).toContain(words);
    expect(html).not.toContain('data-pr-form');
  });

  it('says what is not available yet while the agent works', () => {
    const plain = text(review(attempts.running));

    expect(plain).toContain('Started 3 hours ago. $0.40 of the $5 limit spent so far.');
    expect(plain).toContain("The agent's summary is not available yet.");
    expect(plain).toContain('Our checks have not run yet.');
    expect(plain).toContain('The diff is not available yet.');
  });

  it.each([
    ['submittingQueued', 'QUEUED', 'Approved. The submission starts in a moment.', null],
    ['submittingFork', 'FORK', 'Making your fork of the repo.', 'FORK'],
    ['submittingSync', 'SYNC', 'Bringing your fork up to date', 'SYNC'],
    ['submittingPush', 'PUSH', 'Pushing the change to a branch on your fork.', 'PUSH'],
    ['submittingPr', 'PULL_REQUEST', 'Opening the pull request.', 'PULL_REQUEST'],
  ] as const)('shows the submission at %s', (name, _step, words, current) => {
    const html = review(attempts[name]);
    const plain = text(html);

    expect(html).toContain('data-attempt-status="SUBMITTING"');
    expect(plain).toContain(words);
    expect(plain).toContain('From octocat/driftwood, branch gitranks/871-nested-layouts.');
    if (current)
      expect(html).toMatch(new RegExp(`data-step="${current}" data-step-state="current" aria-current="step"`));
    else expect(html).not.toContain('data-step-state="current"');
    expect(html).toContain('data-panel="approval"');
    expect(html).not.toContain('data-pr-form');
  });

  it('marks the steps already done', () => {
    const html = review(attempts.submittingPush);

    expect(html).toContain('data-step="FORK" data-step-state="done"');
    expect(html).toContain('data-step="SYNC" data-step-state="done"');
    expect(html).toContain('data-step="PULL_REQUEST" data-step-state="pending"');
  });

  it("waits for tomorrow under the day's cap, and says when it goes on", () => {
    const plain = text(review(attempts.waitingCap));

    expect(plain).toContain('Waiting for tomorrow');
    expect(plain).toContain('the pull requests for today are all open');
    expect(plain).toContain('It goes on in 12 hours, at Oct 29, 00:00 UTC.');
  });

  it("shows a step's last error while it is tried again", () => {
    const item = detail({
      ...attempts.submittingPush,
      submit: {
        ...attempts.submittingPush.submit!,
        lastError: {
          reason: 'no_answer',
          note: 'GitHub did not answer. Trying again.',
          at: '2026-10-28T11:40:00.000Z',
        },
      },
    });

    expect(text(review(item))).toContain('GitHub did not answer. Trying again.');
  });

  it.each([
    ['prOpen', 'OPEN', 'Your pull request is open', 'Waiting for a maintainer review'],
    ['followUp', 'OPEN', 'A follow-up is running', 'Changes requested'],
    ['merged', 'MERGED', 'Merged', 'merged 5 minutes ago'],
    ['closed', 'CLOSED', 'Closed without merging', 'Checks failed'],
  ] as const)('links the pull request once it exists: %s', (name, prState, title, words) => {
    const html = review(attempts[name]);
    const plain = text(html);

    expect(html).toContain(`data-pr-state="${prState}"`);
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419"');
    expect(plain).toContain('Pull request #1419 on GitHub');
    expect(plain).toContain(title);
    expect(plain).toContain(words);
  });

  it.each(Object.keys(END_REASONS) as ContributeAttemptEndReason[])(
    'says in plain words why it stopped: %s',
    (reason) => {
      const html = review(stopped(reason, reason === 'NO_GO' ? 'needs a design decision' : 'session_failed'));
      const plain = text(html);

      expect(html).toContain('data-attempt-status="STOPPED"');
      expect(html).toContain(`data-end-reason="${reason}"`);
      expect(plain).toContain(END_REASONS[reason]);
      expect(plain).toContain(reason === 'NO_GO' ? 'Its reason: needs a design decision' : 'Detail: session failed');
    },
  );

  it('says a stop with no reason yet is not available yet', () => {
    expect(text(review(detail({ state: 'STOPPED' })))).toContain('Why it stopped is not available yet.');
  });

  it('degrades every missing part to "not available yet"', () => {
    const plain = text(review(attempts.bare));

    expect(plain).toContain('Issue #871');
    expect(plain).toContain('a repo · issue #871');
    expect(plain).toContain("The agent's summary is not available yet.");
    expect(plain).toContain('The timeline is not available yet.');
    expect(plain).toContain('The diff is not available yet.');
  });

  it('says the review is not available yet while the API does not answer it', () => {
    const html = review(undefined);

    expect(html).toContain('data-review="unavailable"');
    expect(text(html)).toContain('Reviews are not available yet');
  });
});

describe('the attempts waiting for review, on Issues for you and the overview', () => {
  const waiting = [attempt(), attempt({ attemptId: 'A_2', state: 'RUNNING' })];

  it('links each attempt in review to its review screen', () => {
    const html = renderToStaticMarkup(<ReviewsReady attempts={waiting} />);

    expect(html).toContain('data-reviews-ready="1"');
    expect(html).toContain('href="/contribute/attempts/A_1"');
    expect(html).not.toContain('A_2');
    expect(text(html)).toContain('A change is ready for your review');
  });

  it('shows nothing when none waits, or the API does not answer', () => {
    expect(renderToStaticMarkup(<ReviewsReady attempts={[]} />)).toBe('');
    expect(renderToStaticMarkup(<ReviewsReady attempts={undefined} />)).toBe('');
  });

  it('sits above the overview and the feed', () => {
    expect(renderToStaticMarkup(<OverviewStatusView view={views.active} now={NOW} reviews={waiting} />)).toContain(
      'href="/contribute/attempts/A_1"',
    );
    expect(
      renderToStaticMarkup(
        <IssuesScreen view={views.active} page={undefined} query={{}} now={NOW} reviews={waiting} />,
      ),
    ).toContain('href="/contribute/attempts/A_1"');
  });
});

describe('my contributions', () => {
  const list = [
    attempt(),
    attempt({ attemptId: 'A_2', state: 'RUNNING', costUsd: 0.4 }),
    attempt({
      attemptId: 'A_3',
      state: 'SUBMITTING',
      submit: { step: 'WAITING_CAP', waitUntil: '2026-10-29T00:00:00.000Z', fork: null, branch: null, lastError: null },
    }),
    attempt({ attemptId: 'A_4', state: 'STOPPED', endReason: 'NO_GO', costUsd: 0.38 }),
    attempt({ attemptId: 'A_5', state: 'MERGED' }),
  ];
  const render = (
    data: Parameters<typeof ContributionsScreen>[0]['contributions'],
    items: Parameters<typeof ContributionsScreen>[0]['attempts'],
  ) =>
    renderToStaticMarkup(<ContributionsScreen view={views.active} contributions={data} attempts={items} now={NOW} />);

  it('shows the totals: open, merged, closed and cost', () => {
    const html = render(contributions, list);
    const plain = text(html);

    expect(plain).toContain('Merged 1 2 more unlock autopilot');
    expect(plain).toContain('Open 1 1 with changes requested');
    expect(plain).toContain('Closed 1 50% merged of those decided');
    expect(plain).toContain('Credits used $7.86 across 3 pull requests');
    expect(plain).toContain('This cycle: Oct 14 to Nov 14, $63.40 used');
  });

  it('lists the pull requests with repo, issue, state, dates and cost', () => {
    const html = render(contributions, list);
    const plain = text(html);

    expect(plain).toContain('Keep trailing comments when formatting match arms');
    expect(plain).toContain('fern-lang/fern · PR #2490 · issue #2481');
    expect(plain).toContain('Opened Oct 20 Merged Oct 26');
    expect(plain).toContain('Changes requested');
    expect(plain).toContain('Fix for issue #91');
    expect(plain).toContain('a repo · PR #92 · issue #91');
    expect(plain).toContain('Closed Oct 19');
    expect(plain).toContain('$1.84');
    expect(html).toContain('href="/contribute/attempts/A_9"');
    expect(html).toContain('href="https://github.com/fern-lang/fern/pull/2490"');
  });

  it('puts the attempts in review and in progress in their own sections', () => {
    const html = render(contributions, list);
    const plain = text(html);

    expect(html).toContain('data-section="needs-you"');
    expect(plain).toContain('Needs you · 1');
    expect(html).toMatch(/data-attempt="A_1" data-state="REVIEW"/);
    expect(html).toContain('data-section="in-progress"');
    expect(plain).toContain('In progress · 2');
    expect(html).toMatch(/data-attempt="A_2" data-state="RUNNING"/);
    expect(plain).toContain('Waiting for tomorrow: the pull requests for today are all open. It goes on in 12 hours.');
    expect(html).not.toMatch(/data-attempt="A_4"/);
  });

  it('counts how the last attempts ended, with the reasons of the stops', () => {
    const plain = text(render(contributions, list));

    expect(plain).toContain('Your last 5 attempts');
    expect(plain).toContain('Became pull requests 1');
    expect(plain).toContain('Stopped at the go/no-go check 1');
    expect(plain).toContain(END_REASONS.NO_GO);
  });

  it('says what is not available yet, and when there are no pull requests yet', () => {
    const missing = text(render(undefined, undefined));
    expect(missing).toContain('Your totals are not available yet.');
    expect(missing).toContain('Your pull requests are not available yet.');
    expect(missing).toContain('How attempts ended Not available yet.');

    const empty = text(render({ items: [], totals: { open: 0, merged: 0, closed: 0, costUsd: 0 } }, []));
    expect(empty).toContain('No pull requests yet.');
    expect(empty).toContain('No attempts yet');
    expect(empty).not.toContain('Needs you');
  });
});

describe("Contribute's bar", () => {
  it("marks My contributions on an attempt's review, and the overview on the connect flow", () => {
    expect(contributeTabOf('/contribute/attempts/A_1')).toBe('/contribute/me');
    expect(contributeTabOf('/contribute/connect')).toBe('/contribute');
    expect(contributeTabOf('/contribute/issues')).toBe('/contribute/issues');
  });
});

/** A one-file diff of `count` added lines. */
const addedLines = (path: string, count: number) =>
  `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -0,0 +1,${count} @@\n${Array.from(
    { length: count },
    (_, index) => `+line ${index}`,
  ).join('\n')}\n`;

describe('the diff viewer, defended', () => {
  it('still shows the lines of a file marked binary', () => {
    const patch = `diff --git a/src/a.ts b/src/a.ts\nBinary files a/src/a.ts and b/src/a.ts differ\n@@ -0,0 +1 @@\n+fetch(process.env.TOKEN)\n`;
    const html = renderToStaticMarkup(<DiffViewer patch={patch} />);

    expect(text(html)).toContain('+fetch(process.env.TOKEN)');
    expect(text(html)).toContain('A binary file: its content is not shown.');
  });

  it('cuts a file past the most lines shown for one file, and says so', () => {
    const html = renderToStaticMarkup(<DiffViewer patch={addedLines('big.ts', MAX_FILE_LINES + 10)} />);

    expect((html.match(/data-line="add"/g) ?? []).length).toBe(MAX_FILE_LINES - 1);
    expect(html).toContain('data-truncated="true"');
    expect(text(html)).toContain('Showing 2,000 of 2,011 lines.');
    expect(text(html)).toContain('Read it all on GitHub once the pull request is open.');
    expect(text(html)).toContain(`+${MAX_FILE_LINES + 10}`);
  });

  it('cuts the whole patch past the most lines shown, file by file', () => {
    const files = Array.from({ length: 6 }, (_, index) => addedLines(`f${index}.ts`, MAX_FILE_LINES - 1)).join('');
    const html = renderToStaticMarkup(<DiffViewer patch={files} />);

    expect((html.match(/data-line=/g) ?? []).length).toBe(MAX_TOTAL_LINES);
    expect(html).toMatch(/data-file="f4.ts" data-large="true" data-truncated="false"/);
    expect(html).toMatch(/data-file="f5.ts" data-large="true" data-truncated="true"/);
    expect(text(html)).toContain('2,000 lines, past the most shown for one patch.');
  });

  it('marks where the next commit starts in a file two commits changed', () => {
    const one = 'From 1111111 Mon Sep 17 00:00:00 2001\nSubject: [PATCH 1/2] One\n\n---\n';
    const two = '-- \n2.47.0\n\nFrom 2222222 Mon Sep 17 00:00:00 2001\nSubject: [PATCH 2/2] Two\n\n---\n';
    const html = renderToStaticMarkup(
      <DiffViewer patch={`${one}${addedLines('a.ts', 1)}${two}${addedLines('a.ts', 1)}`} />,
    );

    expect(html).toContain('data-line="commit"');
    expect(text(html)).toContain('Next commit: Two');
  });
});

describe('values the UI does not know yet', () => {
  const unknown = <T,>(value: string) => value as unknown as T;

  it('renders an attempt in a new state, with a new model, risk and end reason, without failing', () => {
    const item = detail({
      state: unknown('WAITING_ON_CI'),
      model: unknown('CLAUDE_FUTURE_6'),
      endReason: unknown('SOMETHING_NEW'),
      result: { ...attempts.review.result!, risk: unknown('EXTREME'), verdict: unknown('MAYBE') },
      checks: [{ name: unknown('NEW_CHECK'), passed: true, detail: null }],
      events: [{ state: unknown('WAITING_ON_CI'), detail: null, at: '2026-10-28T11:04:00.000Z' }],
    });
    const plain = text(review(item));

    expect(plain).toContain('Waiting on ci');
    expect(plain).toContain('More about this state is not available yet.');
    expect(plain).toContain('Fix (CLAUDE_FUTURE_6)');
    expect(plain).toContain('Extreme');
    expect(plain).toContain('Maybe');
    expect(plain).toContain('New check');
  });

  it('renders a new end reason, submit step and pull request state', () => {
    expect(text(review(detail({ state: 'STOPPED', endReason: unknown('SOMETHING_NEW') })))).toContain('Something new');
    const step = detail({
      ...attempts.submittingFork,
      submit: { ...attempts.submittingFork.submit!, step: unknown('VERIFY') },
    });
    expect(text(review(step))).toContain('Verify');
    const pr = detail({
      ...attempts.prOpen,
      pullRequest: { ...attempts.prOpen.pullRequest!, state: unknown('DRAFT'), checks: unknown('SKIPPED') },
    });
    expect(text(review(pr))).toContain('Draft');
    expect(text(review(pr))).toContain('Skipped');
  });

  it('lists attempts and pull requests in new states on My contributions', () => {
    const html = renderToStaticMarkup(
      <ContributionsScreen
        view={views.active}
        contributions={{
          ...contributions,
          items: [
            {
              ...contributions.items[0],
              pullRequest: { ...contributions.items[0].pullRequest, state: unknown('DRAFT') },
            },
          ],
        }}
        attempts={[
          attempt({ state: unknown('WAITING_ON_CI') }),
          attempt({ attemptId: 'A_2', state: 'STOPPED', endReason: unknown('NEW') }),
        ]}
        now={NOW}
      />,
    );

    expect(text(html)).toContain('Draft');
    expect(text(html)).toContain('New ·');
  });
});

describe('links the API gives', () => {
  it('link to GitHub only, and read as plain text otherwise', () => {
    const item = detail({
      ...attempts.prOpen,
      url: 'javascript:alert(1)',
      pullRequest: { ...attempts.prOpen.pullRequest!, url: 'https://github.com.evil.example/x/pull/1' },
    });
    const html = review(item);

    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('evil.example');
    expect(text(html)).toContain('driftwood-js/driftwood · issue #871');
    expect(text(html)).toContain('Pull request #1419');

    const list = renderToStaticMarkup(
      <ContributionsScreen
        view={views.active}
        contributions={{
          ...contributions,
          items: [
            {
              ...contributions.items[0],
              pullRequest: { ...contributions.items[0].pullRequest, url: 'http://github.com/x' },
            },
          ],
        }}
        attempts={[]}
        now={NOW}
      />,
    );
    expect(list).not.toContain('http://github.com/x');
    expect(text(list)).toContain('PR #2490');
  });

  it('keep reading an attempt waiting for autopilot again and again, without a stop it does not have', () => {
    expect(LIVE_STATES).toContain('PENDING_AUTOSUBMIT');
    expect(text(review(attempts.pendingAutosubmit))).not.toMatch(/stop/i);
  });
});
