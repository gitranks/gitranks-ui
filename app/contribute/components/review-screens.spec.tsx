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
  loadResolveHumanThreads: vi.fn(async () => undefined),
  loadAttempts: vi.fn(),
  loadContributions: vi.fn(),
}));

const { ReviewScreen } = await import('./review-view');
const { signOffOf } = await import('./pr-form');
const { DiffViewer, LARGE_FILE_LINES, MAX_FILE_LINES, MAX_TOTAL_LINES } = await import('./diff-viewer');
const { ContributionsScreen } = await import('./contributions-view');
const { ReviewsReady } = await import('./reviews-ready');
const { IssuesScreen } = await import('./issues-view');
const { NOW, views, settings } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { PATCH, attempt, attempts, contributions, detail, pullRequest, stopped } = await import(
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

  it('asks for the DCO sign-off only where the repo requires it, says what DCO is, and not under a standing consent', () => {
    const required = detail({ dcoRequired: true });
    const html = review(required);
    expect(html).toContain('data-dco="required"');
    expect(html).toContain('type="checkbox"');
    expect(text(html)).toContain('This repo requires a DCO sign-off.');
    expect(html).toContain('data-dco-explained');
    expect(html).toContain('href="https://developercertificate.org/"');
    // Unticked, Submit waits: an unsigned PR would fail the repo's DCO check.
    expect(html).toContain('data-dco-missing');
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);

    // A repo that requires none: nothing about DCO, whatever its notes say.
    const none = review(
      detail({
        dcoRequired: false,
        readiness: { ...attempts.review.readiness!, notes: 'Commits need Signed-off-by.' },
      }),
    );
    expect(none).not.toContain('data-dco');
    expect(none).not.toContain('type="checkbox"');

    // An API that does not say yet: the old ask, in case the repo does.
    expect(review(attempts.review)).toContain('data-dco="ask"');

    const standing = {
      ...views.active,
      contributor: { ...views.active.contributor, settings: { ...settings, dco: 'STANDING' as const } },
    };
    const consented = review(required, standing);
    expect(consented).toContain('data-dco="standing"');
    expect(text(consented)).toContain(
      'This repo requires a DCO sign-off: the commits are signed off under your standing',
    );
    expect(consented).not.toContain('type="checkbox"');
    expect(consented).not.toContain('data-dco-missing');
    expect(review(detail({ dcoRequired: false }), standing)).not.toContain('data-dco');
  });

  it('shows what the repo needs, checks the title live against its rule, and blocks only a failing hard rule', () => {
    const repoConventions = {
      title: {
        hard: true,
        source: '`.github/semantic.yml`',
        types: ['feat', 'fix', 'docs'],
        scopes: null,
        requireScope: false,
        pattern: null,
      },
      titleExamples: ['fix(router): keep the cache'],
      template: { path: '.github/pull_request_template.md', aiAsks: ['If you are an AI agent, name your model'] },
      changelog: { kind: 'FILE' as const, path: 'CHANGELOG.md', required: true, source: '9 of the last 10' },
      cla: { check: 'license/cla', signUrl: 'https://cla-assistant.io/driftwood-js/driftwood' },
      dco: false,
      generated: ['test-vr/__snapshots__/'],
      notes: [],
    };
    // The agent proposed a title that passes: the form opens with it, Submit open.
    const passing = review(
      detail({
        conventions: repoConventions,
        result: { ...attempts.review.result!, prTitle: 'fix(router): keep the layout cache' },
      }),
    );
    expect(passing).toContain('data-repo-needs');
    expect(passing).toContain('value="fix(router): keep the layout cache"');
    expect(passing).toMatch(/data-need="title" data-state="ok"/);
    expect(passing).toMatch(/data-need="cla" data-state="todo"/);
    expect(passing).toContain('href="https://cla-assistant.io/driftwood-js/driftwood"');
    expect(text(passing)).toContain("A signed CLA: sign it after the PR opens; we can't sign for you");
    expect(passing).toMatch(/data-need="changelog" data-state="todo"/);
    expect(passing).not.toContain('data-title-rule-fails');
    expect(passing).not.toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);

    // The issue's own title fails the repo's checked rule: said, and Submit waits.
    const failing = review(detail({ conventions: repoConventions, title: 'Layout cache drops nested routes' }));
    expect(failing).toMatch(/data-need="title" data-state="blocked"/);
    expect(failing).toContain('aria-invalid="true"');
    expect(failing).toContain('data-title-rule-fails');
    expect(failing).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);

    // A rule the repo only asks for: told, never blocking. No conventions read: no section.
    const soft = review(
      detail({
        conventions: { ...repoConventions, title: { ...repoConventions.title, hard: false } },
        title: 'Layout',
      }),
    );
    expect(soft).toMatch(/data-need="title" data-state="todo"/);
    expect(soft).not.toContain('data-title-rule-fails');
    expect(review(detail())).not.toContain('data-repo-needs');
  });

  it("offers the open pull request's one-click fixes, and the CLA as a link only", () => {
    const html = review(
      detail({
        state: 'PR_OPEN',
        pullRequest: pullRequest(),
        prTitle: 'Layout cache drops nested routes',
        prIssues: [
          {
            kind: 'TITLE',
            check: 'Semantic PR',
            message: "Use the repo's `type(scope): summary` form.",
            suggestion: 'fix: layout cache drops nested routes',
          },
          {
            kind: 'CHANGELOG',
            check: null,
            message: 'The changelog line still waits for the pull request number.',
            suggestion: '- fix: layout cache [#1419](https://github.com/driftwood-js/driftwood/pull/1419)',
          },
          { kind: 'TEMPLATE', check: 'PR description', message: 'Fill in the template.', suggestion: null },
          {
            kind: 'CLA',
            check: 'license/cla',
            message: "Sign the repo's CLA; we can't sign for you.",
            suggestion: 'https://cla-assistant.io/x/y',
          },
        ],
        prFix: { kind: 'LINK', state: 'FAILED', note: 'The branch moved.', at: '2026-10-28T12:00:00.000Z' },
      }),
    );
    const plain = text(html);
    expect(html).toContain('data-panel="pr-conventions"');
    expect(plain).toContain('Retitle to “fix: layout cache drops nested routes”');
    expect(plain).toContain('Fix the changelog line');
    expect(plain).toContain('Edit the description');
    expect(html).toContain('href="https://cla-assistant.io/x/y"');
    expect(html).toContain('data-pr-fix="failed"');
    expect(plain).toContain('Linking the changelog line to the pull request did not go through: The branch moved.');
    // Nothing to fix, nothing sent: no card.
    expect(review(detail({ state: 'PR_OPEN', pullRequest: pullRequest(), prIssues: [], prFix: null }))).not.toContain(
      'data-panel="pr-conventions"',
    );
  });

  it('signs off only where the repo requires it (or the API does not say), with the tick or the standing consent', () => {
    expect(signOffOf(false, 'STANDING', true)).toBe(false);
    expect(signOffOf(false, 'ASK', true)).toBe(false);
    expect(signOffOf(true, 'STANDING', false)).toBe(true);
    expect(signOffOf(true, 'ASK', true)).toBe(true);
    expect(signOffOf(true, 'ASK', false)).toBe(false);
    expect(signOffOf(true, null, false)).toBe(false);
    expect(signOffOf(undefined, 'STANDING', false)).toBe(true);
    expect(signOffOf(undefined, 'ASK', false)).toBe(false);
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
    ['pendingAutosubmit', 'PENDING_AUTOSUBMIT', 'Autopilot submits this unless you stop it'],
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
    // Queued, the fork is next: it reads as starting.
    ['submittingQueued', 'QUEUED', 'Approved. The submission starts in a moment.', 'FORK'],
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

  /** A submission with its steps' clock: fork and sync done, the push running for 4 s at NOW. */
  const clocked = (patch: Partial<ContributeAttemptDetail> = {}, submit = {}) =>
    detail({
      ...attempts.submittingPush,
      ...patch,
      submit: {
        ...attempts.submittingPush.submit!,
        steps: [
          { step: 'FORK', startedAt: '2026-10-28T11:59:50.000Z', doneAt: '2026-10-28T11:59:52.700Z' },
          { step: 'SYNC', startedAt: '2026-10-28T11:59:52.700Z', doneAt: '2026-10-28T11:59:56.000Z' },
          { step: 'PUSH', startedAt: '2026-10-28T11:59:56.000Z', doneAt: null },
        ],
        stepStartedAt: '2026-10-28T11:59:56.000Z',
        forkPending: false,
        retryAt: null,
        ...submit,
      },
    });
  const stepOf = (html: string, step: string) =>
    text(html.match(new RegExp(`<li data-step="${step}"[^>]*>.*?</li>`))?.[0] ?? '');

  it('shows each done step with how long it took, and the running one with its time so far', () => {
    const html = review(clocked());

    expect(html).toContain('data-step="FORK" data-step-state="done"');
    expect(stepOf(html, 'FORK')).toContain('2.7 s');
    expect(stepOf(html, 'SYNC')).toContain('3.3 s');
    expect(html).toMatch(/data-step="PUSH" data-step-state="current" aria-current="step"/);
    expect(stepOf(html, 'PUSH')).toContain('Push : in progress 4 s');
    expect(stepOf(html, 'PULL_REQUEST')).toContain('Pull request : not started');
    // The lines fill behind the done steps only.
    expect((html.match(/data-step-line="filled"/g) ?? []).length).toBe(2);
    expect(html).toContain('role="status"');
    expect(text(html)).toContain('Pushing the change to a branch on your fork.');
  });

  it('spins and pulses only under motion-safe, so reduced motion keeps the stepper still', () => {
    const html = review(clocked()).match(/<ol aria-label="Submission steps".*?<\/ol>/)?.[0] ?? '';
    const animated = [...html.matchAll(/class="([^"]*(?:animate-|transition)[^"]*)"/g)].map(([, classes]) => classes);

    expect(animated.length).toBeGreaterThan(0);
    for (const classes of animated) {
      for (const name of classes.split(' ').filter((name) => /animate-|transition|duration-/.test(name))) {
        expect(name.startsWith('motion-safe:') || name.startsWith('motion-reduce:'), name).toBe(true);
      }
    }
  });

  it('says GitHub is making the fork while it waits for it', () => {
    const html = review(clocked({}, { step: 'FORK', steps: [], forkPending: true, stepStartedAt: NOW.toISOString() }));

    expect(text(html)).toContain('GitHub is making your fork. A new fork can take a few minutes.');
    expect(html).toMatch(/data-step="FORK" data-step-state="current"/);
  });

  it('marks a step tried again after a passing failure, and says when', () => {
    const html = review(
      clocked(
        {},
        {
          retryAt: '2026-10-28T12:00:45.000Z',
          lastError: {
            reason: 'transient',
            note: 'GitHub did not answer; trying again shortly.',
            at: NOW.toISOString(),
          },
        },
      ),
    );

    expect(html).toMatch(/data-step="PUSH" data-step-state="retrying" aria-current="step"/);
    expect(stepOf(html, 'PUSH')).toContain('Again in 45 s');
    // The countdown sits on the step; the live line keeps the note alone, so it is not read out every second.
    expect(text(html)).toContain('GitHub did not answer; trying again shortly. From octocat/driftwood');
    // Said once, in the stepper's line.
    expect(html).not.toContain('data-submit-error');
  });

  it('shows the sync as not needed when the own repo stands for the fork', () => {
    const html = review(
      clocked(
        {},
        {
          step: 'PULL_REQUEST',
          steps: [
            { step: 'FORK', startedAt: '2026-10-28T11:59:50.000Z', doneAt: '2026-10-28T11:59:51.000Z' },
            { step: 'PUSH', startedAt: '2026-10-28T11:59:51.000Z', doneAt: '2026-10-28T11:59:55.000Z' },
            { step: 'PULL_REQUEST', startedAt: '2026-10-28T11:59:55.000Z', doneAt: null },
          ],
        },
      ),
    );

    expect(html).toContain('data-step="SYNC" data-step-state="skipped"');
    expect(stepOf(html, 'SYNC')).toContain('Not needed');
    expect((html.match(/data-step-line="filled"/g) ?? []).length).toBe(3);
  });

  it('shows where a submission failed, with its note and a way to try again', () => {
    const html = review(
      clocked(
        { state: 'REVIEW' },
        {
          lastError: {
            reason: 'branch_conflict',
            note: 'Your fork already has this branch with other commits.',
            at: NOW.toISOString(),
          },
        },
      ),
    );

    expect(html).toContain('data-attempt-status="REVIEW"');
    expect(html).toContain('data-step="FORK" data-step-state="done"');
    expect(html).toContain('data-step="PUSH" data-step-state="failed"');
    expect(stepOf(html, 'PUSH')).toContain('Push : failed Failed');
    expect(text(html)).toContain('Your fork already has this branch with other commits.');
    expect(text(html)).toContain('Try again');
    expect(html).toContain('id="pr-form"');
  });

  it('shows the steps done and links the pull request when it just opened', () => {
    const opened = clocked(
      { state: 'PR_OPEN', pullRequest: pullRequest({ openedAt: '2026-10-28T11:59:59.000Z' }) },
      {
        step: 'PULL_REQUEST',
        steps: [
          { step: 'FORK', startedAt: '2026-10-28T11:59:50.000Z', doneAt: '2026-10-28T11:59:52.700Z' },
          { step: 'SYNC', startedAt: '2026-10-28T11:59:52.700Z', doneAt: '2026-10-28T11:59:56.000Z' },
          { step: 'PUSH', startedAt: '2026-10-28T11:59:56.000Z', doneAt: '2026-10-28T11:59:57.500Z' },
          { step: 'PULL_REQUEST', startedAt: '2026-10-28T11:59:57.500Z', doneAt: '2026-10-28T11:59:59.000Z' },
        ],
      },
    );
    const html = review(opened);

    expect(html).toContain('data-attempt-status="PR_OPEN"');
    expect((html.match(/data-step-state="done"/g) ?? []).length).toBe(4);
    expect(stepOf(html, 'PULL_REQUEST')).toContain('Pull request #1419 ↗');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419"');
    expect(text(html)).toContain('Your pull request is open');

    // Opened a while ago: the PR card alone.
    expect(review(attempts.prOpen)).not.toContain('data-step-state');
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

  it('a check that ran out never reads as a no-go, and offers one retry on a bigger budget', () => {
    const detailText = 'Ran out of the $0.50 check budget after 19 min before deciding; last step: bash: cargo build';
    const ranOut = detail({ ...stopped('BUDGET', detailText), stoppedInCheck: true, retryable: true });
    const html = review(ranOut);
    const plain = text(html);
    expect(plain).toContain('Stopped while checking the issue');
    expect(plain).toContain('Stopped: ran out of budget while checking the issue.');
    expect(plain).toContain(`Detail: ${detailText}`);
    expect(plain).toContain('nothing was said about the issue');
    expect(plain).not.toContain('decided not to go ahead');
    expect(plain).not.toContain('went back to the pool');
    expect(html).toContain('data-check-stop');
    expect(plain).toContain('Retry with a bigger check budget');

    // Tried again already: the words stay, the button goes.
    expect(text(review(detail({ ...ranOut, retryable: false })))).not.toContain('Retry with a bigger check budget');
    // The time cap says time; an API without the field is read from the detail.
    const late = text(review(stopped('TIMEOUT', 'Hit the 15-min check limit ($0.42 of $1.00 spent) before deciding')));
    expect(late).toContain('Stopped: ran out of time while checking the issue.');
    expect(late).not.toContain('Retry with a bigger check budget');
    // A budget stop in the work is the attempt's limit, as before.
    expect(text(review(detail({ ...stopped('BUDGET'), stoppedInCheck: false })))).toContain(END_REASONS.BUDGET);
  });

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

  it('sits above the feed', () => {
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
    attempt({
      attemptId: 'A_6',
      state: 'STOPPED',
      endReason: 'BUDGET',
      endDetail: 'Ran out of the $1.00 check budget',
    }),
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

    expect(plain).toContain('Your last 6 attempts');
    expect(plain).toContain('Became pull requests 1');
    expect(plain).toContain('Stopped at the go/no-go check 1');
    expect(plain).toContain('Ran out while checking the issue 1');
    expect(plain).toContain('Stopped for another reason 0');
    expect(plain).toContain(END_REASONS.NO_GO);
    expect(plain).toContain('Stopped: ran out of budget while checking the issue.');
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

  it('keep reading an attempt waiting for autopilot again and again, without a Stop the API does not answer yet', () => {
    expect(LIVE_STATES).toContain('PENDING_AUTOSUBMIT');
    const html = review(attempts.pendingAutosubmit);
    expect(html).not.toContain('data-stop-autopilot');
    expect(text(html)).toContain('When it submits, and stopping it, are not available yet.');
  });
});
