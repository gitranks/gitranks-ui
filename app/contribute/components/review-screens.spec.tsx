import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute/attempts/A_1',
  useSearchParams: () => new URLSearchParams(),
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
const { signOffOf, submitWaitsOf } = await import('./pr-form');
const { DiffViewer, LARGE_FILE_LINES, MAX_FILE_LINES, MAX_TOTAL_LINES } = await import('./diff-viewer');
const { ContributionsScreen } = await import('./contributions-view');
const { ReviewsReady } = await import('./reviews-ready');
const { IssuesScreen } = await import('./issues-view');
const { NOW, views, settings } = await import('@/lib/contribute/__fixtures__/contribute-views');
const {
  PATCH,
  attempt,
  attempts,
  contributions,
  decisionAttempts,
  detail,
  feedbackThread,
  followUpAttempts,
  followUps,
  pullRequest,
  repoConventions,
  stopped,
} = await import('@/lib/contribute/__fixtures__/contribute-attempts');
const { END_REASONS, LIVE_STATES } = await import('@/lib/contribute/attempt-format');
const { settingsPathOf } = await import('@/lib/contribute/settings-paths');
const { attemptRules } = await import('@/lib/contribute/__fixtures__/repo-rules');

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

/** Whether a tab's panel is the one shown: `active`, else `inactive` (rendered, hidden). */
const panel = (html: string, tab: string) =>
  html.match(new RegExp(`<div data-state="(\\w+)"[^>]*data-tab-panel="${tab}"`))?.[1];

const review = (item: ContributeAttemptDetail | undefined, view: ContributeView = views.active) =>
  renderToStaticMarkup(<ReviewScreen view={view} attempt={item} now={NOW} />);
/** The contribution's next step (`?session=next`), where what waits on its pull request is done. */
const reviewNext = (item: ContributeAttemptDetail) =>
  renderToStaticMarkup(<ReviewScreen view={views.active} attempt={item} next now={NOW} />);

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

describe('the contribution page', () => {
  describe('lays the frame out in phone order', () => {
    const notes = {
      stopped: null,
      notes: [
        {
          feedbackId: 'N_1',
          login: 'sam-w',
          role: 'MAINTAINER' as const,
          likes: [],
          word: 'Clean fix.',
          at: '2026-10-28T09:00:00.000Z',
          hidden: false,
        },
      ],
    };
    const gridOf = (html: string) => (html.match(/<div class="(grid [^"]*)"/)?.[1] ?? '').replaceAll('&#x27;', "'");
    const paneOf = (html: string) => html.match(/<div class="(\[grid-area:pane\][^"]*)"/)?.[1];
    const notesOf = (html: string) => html.match(/<section [^>]*data-pr-notes=""[^>]*>/)?.[0] ?? '';

    it('with the rail: sessions, the session shown, the rules, the notes', () => {
      const html = renderToStaticMarkup(
        <ReviewScreen
          view={views.active}
          attempt={{ ...followUpAttempts.prNeedsYou, repoRules: attemptRules() }}
          now={NOW}
          prNotes={notes}
        />,
      );
      const order = ['data-sessions', 'data-shown-session', 'data-repo-rules', 'data-pr-notes'].map((mark) =>
        html.indexOf(mark),
      );
      expect(order.every((at) => at > -1)).toBe(true);
      expect(order).toEqual([...order].sort((a, b) => a - b));
      expect(gridOf(html)).toContain('gap-y-0');
      expect(gridOf(html)).toContain("[grid-template-areas:'sessions'_'pane'_'rules'_'notes']");
      expect(gridOf(html)).toContain("lg:[grid-template-areas:'sessions_pane'_'rules_pane'_'notes_pane']");
      expect(paneOf(html)).toBe('[grid-area:pane] min-w-0 mt-5 lg:mt-0');
      expect(notesOf(html)).toContain('lg:mt-4');
    });

    it('renders no area for rules or notes it does not have', () => {
      const html = review({ ...followUpAttempts.prNeedsYou, repoRules: null });
      expect(html).not.toContain('[grid-area:rules]');
      expect(html).not.toContain('[grid-area:notes]');
    });

    it('without the rail: the session shown, then the notes, in one column', () => {
      const html = renderToStaticMarkup(
        <ReviewScreen view={views.active} attempt={followUpAttempts.review} now={NOW} prNotes={notes} />,
      );
      expect(gridOf(html)).toBe("grid grid-cols-[minmax(0,1fr)] gap-y-0 [grid-template-areas:'pane'_'notes']");
      expect(paneOf(html)).toBe('[grid-area:pane] min-w-0');
      expect(notesOf(html)).toContain('mt-5');
      expect(notesOf(html)).not.toContain('lg:mt-4');
      expect(html.indexOf('data-pr-notes')).toBeGreaterThan(html.indexOf('data-shown-session'));
    });
  });

  it("opens a review on the change itself, the pull request's form behind its button", () => {
    const html = review(attempts.review);
    expect(panel(html, 'changes')).toBe('active');
    expect(html).not.toContain('data-tab-panel="summary"');
    expect(html).toContain('data-submit-panel="closed"');
    expect(text(html)).toContain('Write the pull request');
    expect(text(html)).not.toContain('Write the pull request…');
    expect(text(html)).not.toContain('Its title and text');
    // The form is there, hidden: the way back from GitHub's access screen runs either way.
    expect(html).toContain('data-pr-form="A_1"');
  });

  it('opens the form by itself after a submit that bounced, adding no error line of its own', () => {
    const html = review(attempts.bounced);
    expect(html).toContain('data-submit-panel="open"');
    expect(text(html).match(/GitHub is still making your fork/g)).toHaveLength(1);
    const error = html.indexOf('data-submit-error');
    expect(error).toBeGreaterThan(-1);
    expect(html.indexOf('GitHub is still making your fork')).toBeGreaterThan(error);
    expect(html.indexOf('GitHub is still making your fork')).toBeLessThan(html.indexOf('data-pr-form'));
  });

  it('opens a pull request on its change, the header saying where it stands and no box saying it again', () => {
    const html = review(attempts.prOpen);
    expect(panel(html, 'changes')).toBe('active');
    expect(html).toMatch(/<details data-panel="approval" class=/);
    expect(html).toContain('data-pr-state="OPEN"');
    expect(html).not.toContain('data-attempt-status="PR_OPEN"');
  });

  it('opens on Changes, else Checks, else Activity', () => {
    for (const item of [attempts.review, attempts.pendingAutosubmit, attempts.prOpen]) {
      expect(panel(review(item), 'changes')).toBe('active');
    }
    const run = renderToStaticMarkup(
      <ReviewScreen
        view={views.active}
        attempt={followUpAttempts.repliesOnly}
        first={followUpAttempts.underWay}
        now={NOW}
      />,
    );
    expect(panel(run, 'checks')).toBe('active');
    for (const item of [attempts.running, stopped('FAILED'), decisionAttempts.noGo, attempts.bare]) {
      expect(panel(review(item), 'activity')).toBe('active');
    }
  });

  it('has three tabs, the same on a first attempt and a run', () => {
    const html = review(attempts.review);
    expect(html.match(/data-tab="\w+"/g)).toEqual(['data-tab="changes"', 'data-tab="checks"', 'data-tab="activity"']);
  });

  it('says a session made no change in its own words', () => {
    const html = review(decisionAttempts.noGo);
    const changes = html.slice(html.indexOf('data-tab-panel="changes"'), html.indexOf('data-tab-panel="checks"'));
    expect(text(changes)).toContain('The agent changed no files.');
  });

  it('keeps spend out of what the agent did, and says it in Activity', () => {
    /** The markup of the "What the agent did" card. */
    const card = (html: string) => {
      const start = html.indexOf('data-panel="agent-did"');
      expect(start).toBeGreaterThan(-1);
      return html.slice(start, html.indexOf('</section>', start));
    };
    const activity = (html: string) => html.slice(html.indexOf('data-tab-panel="activity"'));

    const ready = review(attempts.review);
    expect(card(ready)).not.toContain('$');
    expect(text(activity(ready))).toContain('$2.36 of your $5 limit');

    const ranOut = review(decisionAttempts.ranOut);
    // The check's cap is why it stopped, not spend: it may be named; what was spent is not.
    expect(card(ranOut)).not.toContain('$0.61');
    expect(card(ranOut)).not.toContain('after $');
    expect(card(ranOut)).not.toContain('data-panel="cost"');
    expect(text(activity(ranOut))).toContain('$0.61 of your $5 limit');
  });

  it('says how many files changed only on the tab and the diff', () => {
    const html = review(attempts.review);
    const details = html.slice(html.indexOf('data-session-details'));
    expect(text(details).match(/3 files/g)).toHaveLength(2);
    expect(text(details)).not.toContain('files changed');
  });

  it('hides the approved row in review, where the form holds it', () => {
    expect(review(attempts.bounced)).not.toContain('data-panel="approval"');
    const html = review(attempts.prOpen);
    expect(html).toContain('data-panel="approval"');
    expect(text(html)).toContain('What you approved Normalize route paths · Oct 28');
  });

  it("shows a round with its pull request's sessions, read from the first attempt", () => {
    const html = renderToStaticMarkup(
      <ReviewScreen
        view={views.active}
        attempt={followUpAttempts.review}
        // The round in review is the one under way on its pull request.
        first={{ ...followUpAttempts.prNeedsYou, followUps: followUps({ used: 1, currentAttemptId: 'A_F1' }) }}
        now={NOW}
      />,
    );
    const plain = text(html);
    expect(html).toContain('data-pr-state="OPEN"');
    expect(html).not.toContain('data-session="next"');
    expect(html).toMatch(/data-session="A_F1"[^>]*><a[^>]*aria-current="page"/);
    expect(plain).toContain('Run 1 Ready for you');
    // The run's comments sit above the details; the details open on its new commits.
    expect(html.indexOf('data-panel="replies"')).toBeGreaterThan(-1);
    expect(html.indexOf('data-panel="replies"')).toBeLessThan(html.indexOf('data-session-tabs'));
    expect(html).not.toContain('data-tab="replies"');
    expect(panel(html, 'changes')).toBe('active');
    expect(html).not.toContain('data-follow-up-of');
  });

  it("shows an own agent's round with the agent that made it", () => {
    const round = {
      ...followUpAttempts.review,
      runner: 'MCP' as const,
      agent: { name: 'CLAUDE_CODE' as const, model: null },
    };
    const html = review(round);
    expect(html).toContain('data-agent-meta');
    expect(text(html)).toContain('Made by Claude Code, as your agent reported it.');
  });

  it('says nothing needs the user once a fix settled with nothing left to fix', () => {
    const fixed = {
      ...followUpAttempts.prNeedsYou,
      needsYou: null,
      prIssues: [],
      prFix: { kind: 'TITLE' as const, state: 'DONE' as const, note: null, at: '2026-10-28T11:50:00.000Z' },
    };
    expect(review(fixed)).not.toContain('data-needs-you');
  });

  it('still lists the waiting comments, with why, while a run is under way', () => {
    const busy = {
      ...followUpAttempts.quiet,
      state: 'FOLLOW_UP' as const,
      followUps: followUps({ used: 2, currentAttemptId: 'A_F3' }),
      reviewFeedback: { readAt: null, threads: [feedbackThread()] },
    };
    // On the first attempt's own session: the run at work, and the way to it.
    const line = review(busy);
    expect(line).toContain('data-your-move="working"');
    expect(text(line)).toContain('Run 2 working Under way. It comes back here when it is ready. Watch run 2 →');
    expect(line).toContain('href="/contribute/attempts/A_1/runs/A_F3"');
    const html = renderToStaticMarkup(<ReviewScreen view={views.active} attempt={busy} next now={NOW} />);
    expect(html).toContain('data-panel="review-feedback"');
    expect(text(html)).toContain('A follow-up is under way on these comments.');
    expect(html).not.toContain('data-start-follow-up');
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
    expect(html).not.toContain('data-first-timers');
    // The label as a chip on the repo line, what it means on a hover or a tap, and for screen readers.
    const labelled = review({ ...failing, newcomersLabel: 'first-timers-only' });
    const chip = labelled.match(/<button[^>]*data-first-timers=""[^>]*>(.*?)<\/button>/)?.[1] ?? '';
    expect(text(chip)).toContain('first-timers-only');
    expect(chip).toContain('<span class="sr-only">: the maintainers keep it for people new to the project</span>');
    expect(text(labelled)).not.toContain('Labelled first-timers-only');
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
    expect(html).toMatch(/<details data-panel="readiness" class="[^"]*"><summary/);
    expect(html.indexOf('data-panel="agent-did"')).toBeGreaterThan(-1);
    expect(html.indexOf('data-panel="agent-did"')).toBeLessThan(html.indexOf('data-session-tabs'));
    // The rail's tile keeps its own note; the session says it on the tab and the diff.
    expect(text(html.slice(html.indexOf('data-session-details')))).not.toContain('3 files changed');
  });

  it('pre-fills the pull request from the agent, without its footer, and previews the footer the API adds', () => {
    const html = review(attempts.review);
    const plain = text(html);

    expect(html).toContain('value="Nested layouts re-render on every navigation"');
    expect(html).toMatch(/<textarea[^>]*>Fixes #871\n\n## What changed\nNormalize the route path.<\/textarea>/);
    expect(html).not.toContain('reviewed by @someone');
    expect(html).toContain('data-pr-footer');
    // An API that does not say its footer writes the old one.
    expect(plain).toContain('🤖 Made with Claude via [gitranks.com](https://gitranks.com) · reviewed by @octocat');
    expect(plain).toContain('Each commit names gitranks as co-author');
    expect(plain).toContain('Submit pull request');
    expect(plain).toContain('Discard');
    // Write and Preview: the preview is drawn, hidden, beside the textarea.
    expect(html).toMatch(/<div data-state="inactive"[^>]*data-pr-preview/);
    expect(html).toMatch(/<div data-state="active"[^>]*>\s*<textarea/);
    expect(html).toMatch(/<button[^>]*role="tab"[^>]*>Write<\/button>/);
    expect(html).toMatch(/<button[^>]*role="tab"[^>]*>Preview<\/button>/);
  });

  it('switches the description to Write and Preview, a phone-sized target each', () => {
    const html = review(attempts.review);
    const form = html.slice(html.indexOf('data-pr-form'));
    const list = form.match(/<div role="tablist"[^>]*>/)?.[0] ?? '';
    expect(list).toContain('aria-label="Description"');
    expect(list).toContain('max-sm:h-11');
    expect(form.match(/role="tab"[^>]*class="[^"]*max-sm:min-h-11/g)).toHaveLength(2);
  });

  it('previews the footer and co-author as the API writes them (PR disclosure spec §5)', () => {
    const footer =
      'This PR was written in part with the assistance of generative AI.\n\n<sub>Made with [GitRanks Contribute](https://gitranks.com) and Codex (GPT) · Reviewed and submitted by @octocat</sub>';
    const plain = text(review(detail({ prFooter: footer, prCoAuthored: false })));

    expect(plain).toContain('This PR was written in part with the assistance of generative AI.');
    expect(plain).toContain('and Codex (GPT) · Reviewed and submitted by @octocat');
    expect(plain).toContain('No co-author line: the repo bans AI trailers');
    expect(plain).not.toContain('Each commit names gitranks as co-author');
    expect(plain).toContain(
      'A footer line linking gitranks.com, added to every pull request Preview This repo asks AI-written pull requests to say so, in its words above the footer.',
    );
  });

  it('adds the issue link to the preview when the body does not close the issue', () => {
    const html = review(detail({ result: { ...attempts.review.result!, prBody: 'Just a change.' } }));

    expect(html).toMatch(/<pre[^>]*>Fixes #871\n\nJust a change.<\/pre>/);
  });

  it('asks for the DCO sign-off only where the repo requires it, says what DCO is, and not under a standing consent', () => {
    const required = detail({ dcoRequired: true });
    const html = review(required);
    expect(html).toMatch(/data-need="dco" data-state="blocked"[^>]*data-dco="required"/);
    expect(html).toContain('type="checkbox"');
    expect(html).toMatch(/<button type="button" role="checkbox" aria-checked="false"/);
    expect(text(html)).toContain(
      'Sign off the commits (DCO): the repo requires it. I certify the Developer Certificate of Origin for this change.',
    );
    expect(html).toContain('data-dco-explained');
    expect(html).toContain('href="https://developercertificate.org/"');
    // Unticked, Submit waits: an unsigned PR would fail the repo's DCO check.
    expect(html).toContain('data-submit-waits="dco"');
    expect(text(html)).toContain('Tick the DCO sign-off to submit');
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);

    // A repo that requires none: nothing about DCO, whatever its notes say.
    const none = review(
      detail({
        dcoRequired: false,
        readiness: { ...attempts.review.readiness!, notes: 'Commits need Signed-off-by.' },
      }),
    );
    expect(none).not.toContain('data-dco');
    expect(none).not.toContain('data-need="dco"');
    expect(none).not.toContain('type="checkbox"');

    // An API that does not say yet: the old ask, in case the repo does.
    expect(review(attempts.review)).toContain('data-dco="ask"');

    const standing = {
      ...views.active,
      contributor: { ...views.active.contributor, settings: { ...settings, dco: 'STANDING' as const } },
    };
    const consented = review(required, standing);
    expect(consented).toMatch(/data-need="dco" data-state="ok"[^>]*data-dco="standing"/);
    expect(text(consented)).toContain(
      'Commits signed off (DCO): the repo requires it, and your settings give it. Change',
    );
    expect(consented).toContain(`href="${settingsPathOf('prs')}">Change</a>`);
    expect(consented).not.toContain('type="checkbox"');
    expect(consented).not.toContain('data-submit-waits');
    expect(review(detail({ dcoRequired: false }), standing)).not.toContain('data-dco');
  });

  it('shows what the repo needs, checks the title live against its rule, and blocks only a failing hard rule', () => {
    const conventions = repoConventions();
    // The agent proposed a title that passes: the form opens with it, Submit open.
    const passing = review(
      detail({
        conventions,
        result: { ...attempts.review.result!, prTitle: 'fix(router): keep the layout cache' },
      }),
    );
    expect(passing).toContain('data-pr-checklist');
    expect(text(passing)).toContain('Before it opens');
    expect(passing).toContain('value="fix(router): keep the layout cache"');
    expect(passing).toMatch(/data-need="title" data-state="ok"/);
    expect(passing).toMatch(/data-need="cla" data-state="todo"/);
    expect(passing).toContain('href="https://cla-assistant.io/driftwood-js/driftwood"');
    expect(text(passing)).toContain("A signed CLA: sign it after the PR opens; we can't sign for you");
    expect(passing).toMatch(/data-need="changelog" data-state="todo"/);
    expect(passing).not.toContain('data-submit-waits');
    expect(passing).not.toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
    // The rows in order: what Submit waits on, the repo's asks after it opens, what GitRanks adds.
    expect(passing.match(/data-need="\w+"/g)).toEqual([
      'data-need="title"',
      'data-need="dco"',
      'data-need="cla"',
      'data-need="changelog"',
      'data-need="template"',
      'data-need="generated"',
      'data-need="coauthor"',
      'data-need="footer"',
    ]);

    // The issue's own title fails the repo's checked rule: said, and Submit waits.
    const failing = review(detail({ conventions, title: 'Layout cache drops nested routes' }));
    expect(failing).toMatch(/data-need="title" data-state="blocked"/);
    expect(failing).toContain('aria-invalid="true"');
    expect(failing).toContain('data-submit-waits="title"');
    expect(failing).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);

    // A rule the repo only asks for: told, never blocking. No conventions read: only the DCO and GitRanks' own rows.
    const soft = review(
      detail({
        conventions: { ...conventions, title: { ...conventions.title!, hard: false } },
        title: 'Layout',
      }),
    );
    expect(soft).toMatch(/data-need="title" data-state="todo"/);
    expect(soft).not.toContain('data-submit-waits');
    expect(review(detail()).match(/data-need="\w+"/g)).toEqual([
      'data-need="dco"',
      'data-need="coauthor"',
      'data-need="footer"',
    ]);
  });

  it('offers to add the prefix the repo requires', () => {
    const html = review(
      detail({
        conventions: repoConventions({ title: null, titleExamples: [], titlePrefix: '[AI]' }),
        title: 'Fix the null error',
      }),
    );
    expect(html).toMatch(/data-need="title" data-state="blocked"/);
    expect(html).toMatch(
      /<button[^>]*type="button" aria-label="Add “\[AI\]” to the start of the title">Add “\[AI\]”<\/button>/,
    );
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
    expect(html).toContain('data-submit-waits="title"');
  });

  it('says what Submit waits on in one line', () => {
    const html = review(
      detail({ conventions: repoConventions(), title: 'Layout cache drops nested routes', dcoRequired: true }),
    );
    expect(html).toContain('data-submit-waits="title dco"');
    expect(text(html).match(/Fix the title and tick the DCO sign-off to submit\./g)).toHaveLength(1);
    expect(html.match(/data-submit-waits=/g)).toHaveLength(1);

    const none = { titleMissing: false, titleRuleFails: false, signOffMissing: false };
    expect(submitWaitsOf(none)).toBeNull();
    expect(submitWaitsOf({ ...none, titleMissing: true })).toEqual({
      tokens: 'title-missing',
      words: 'Add a title to submit.',
    });
    expect(submitWaitsOf({ ...none, titleRuleFails: true })).toEqual({
      tokens: 'title',
      words: "Fix the title to submit: as it is, it would fail the repo's rules on the pull request.",
    });
    expect(submitWaitsOf({ ...none, signOffMissing: true })).toEqual({
      tokens: 'dco',
      words: 'Tick the DCO sign-off to submit: this repo checks every commit for one.',
    });
    expect(submitWaitsOf({ ...none, titleMissing: true, signOffMissing: true })).toEqual({
      tokens: 'title-missing dco',
      words: 'Add a title and tick the DCO sign-off to submit.',
    });
    expect(submitWaitsOf({ ...none, titleRuleFails: true, signOffMissing: true })).toEqual({
      tokens: 'title dco',
      words: 'Fix the title and tick the DCO sign-off to submit.',
    });
  });

  it('has one submit button: every other button in the form is a plain button', () => {
    const form = (html: string) => {
      const start = html.indexOf('<form id="pr-form"');
      expect(start).toBeGreaterThan(-1);
      return html.slice(start, html.indexOf('</form>', start));
    };
    const prefixed = detail({
      conventions: repoConventions({ titlePrefix: '[AI]' }),
      result: { ...attempts.review.result!, prTitle: 'fix(router): keep the layout cache' },
    });
    for (const [item, view] of [
      [attempts.review, views.active],
      [attempts.bounced, views.active],
      [detail({ conventions: repoConventions() }), views.active],
      [prefixed, views.active],
      [attempts.review, views.firstKey],
    ] as const) {
      const html = form(review(item, view));
      expect(html.match(/type="submit"/g)).toHaveLength(1);
      expect(html.match(/<button(?![^>]*type=)/g)).toBeNull();
    }
    const withFix = form(review(prefixed));
    expect(withFix).toMatch(/<button[^>]*type="button"[^>]*>Add “\[AI\]”<\/button>/);
    expect(withFix).toMatch(/<button[^>]*type="button"[^>]*>Preview<\/button>/);
  });

  it("offers the open pull request's one-click fixes, and the CLA as a link only", () => {
    const html = reviewNext(
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
    // A repo whose agent rules leave the template for the human: why, the steps, each section drafted, the link.
    const template = reviewNext(
      detail({
        state: 'PR_OPEN',
        pullRequest: pullRequest(),
        prIssues: [
          {
            kind: 'TEMPLATE',
            check: null,
            message: "Fill in #1419's description on GitHub: Description and Checklist.",
            suggestion: 'https://github.com/driftwood-js/driftwood/pull/1419',
            why: "driftwood-js/driftwood's rules for AI agents say an agent must leave the pull request template empty.",
            steps: ['Try the change yourself first.', 'Open #1419 on GitHub, click ··· on the description, then Edit.'],
            fields: [
              { label: 'Description', value: 'Nested layouts keep their state.', note: null, tick: null },
              { label: 'Release notes added', value: null, note: 'The change adds CHANGELOG.md.', tick: true },
              { label: 'Docs updated', value: null, note: 'The change touches no docs.', tick: false },
            ],
            source: { label: 'AGENTS.md', url: 'https://github.com/driftwood-js/driftwood/blob/HEAD/AGENTS.md' },
          },
        ],
        prFix: null,
      }),
    );
    const guide = text(template);
    expect(guide).toContain('Open #1419 on GitHub');
    expect(template).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419"');
    expect(guide).toContain("Why you see this: driftwood-js/driftwood's rules for AI agents");
    expect(template).toContain('href="https://github.com/driftwood-js/driftwood/blob/HEAD/AGENTS.md"');
    expect(guide).toContain('What to do');
    expect(template).toContain('<li>Try the change yourself first.</li>');
    expect(guide).toContain('Under “Description” Nested layouts keep their state.');
    expect(template).toContain('aria-label="Copy the text for Description"');
    expect(guide).toContain('Tick: Release notes added The change adds CHANGELOG.md.');
    expect(guide).toContain('Leave unticked: Docs updated');
    // Nothing to fix, nothing sent: no card.
    expect(
      reviewNext(detail({ state: 'PR_OPEN', pullRequest: pullRequest(), prIssues: [], prFix: null })),
    ).not.toContain('data-panel="pr-conventions"');
  });

  it('gives the comment that signs an agreement signed on the pull request, to copy', () => {
    const signComment = 'I have read the DCO document and I hereby sign the DCO.';
    const html = reviewNext(
      detail({
        state: 'PR_OPEN',
        pullRequest: pullRequest(),
        conventions: {
          ...detail().conventions!,
          cla: {
            check: 'DCO',
            signUrl: 'https://github.com/driftwood-js/dco/blob/main/dco.md',
            agreement: 'DCO',
            signComment,
          },
        },
        prIssues: [
          {
            kind: 'CLA',
            check: 'DCO',
            message: `Sign the repo's DCO: post this comment on the pull request yourself, word for word: "${signComment}". We can't sign for you.`,
            suggestion: 'https://github.com/driftwood-js/dco/blob/main/dco.md',
          },
        ],
        prFix: null,
      }),
    );
    const plain = text(html);
    expect(plain).toContain(
      "Sign the repo's DCO: post this comment on the pull request yourself. We can't sign for you. (DCO)",
    );
    expect(plain.split(signComment)).toHaveLength(2);
    expect(html).toContain('aria-label="Copy the comment"');
    expect(plain).toContain('Read the DCO first');
    expect(html).toContain('href="https://github.com/driftwood-js/dco/blob/main/dco.md"');
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
    expect(html).not.toContain('data-panel="approval"');
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

  it("shows the claim's check step by step while it starts, a failed read with its word", () => {
    const at = '2026-11-08T12:00:00.000Z';
    const html = review({
      ...attempts.queued,
      state: 'CLAIMING',
      claimSteps: [
        { key: 'issue', words: 'Reading the issue and its timeline', at, state: 'done' },
        { key: 'policy', words: "Reading the repository's rules", at, state: 'failed' },
        { key: 'conventions', words: "Reading the repository's conventions", at, state: 'running' },
      ],
    });
    const plain = text(html);

    expect(html).toContain('data-attempt-status="CLAIMING"');
    expect(html).toContain('data-claim-step="conventions" data-state="running"');
    expect(plain).toContain('Reading the issue and its timeline');
    expect(plain).toContain("Reading the repository's rules (failed)");
    expect(plain.indexOf('timeline')).toBeLessThan(plain.indexOf('conventions'));

    // An API without steps, or none yet: the box as before.
    expect(review({ ...attempts.queued, state: 'CLAIMING' })).not.toContain('data-claim-steps');
    expect(review({ ...attempts.queued, state: 'CLAIMING', claimSteps: [] })).not.toContain('data-claim-steps');
  });

  it("names the repo's rule and the user's move when the claim gate refused the attempt at its start", () => {
    const html = review({ ...attempts.discarded, endReason: 'CANCELLED', endDetail: 'repo_coordinate_first' });
    const plain = text(html);

    expect(html).toContain('data-attempt-status="DISCARDED"');
    expect(plain).toContain('no maintainer has agreed to this one yet, so the agent did not start.');
    expect(plain).toContain('Nothing was submitted.');
    expect(plain).not.toContain('went back to the pool');
    expect(plain).toContain('What to do: To work on it, ask on the issue on GitHub');
    // Any other discard keeps its words and no move.
    expect(text(review(attempts.discarded))).not.toContain('What to do');
  });

  it('says what is not available yet while the agent works', () => {
    const plain = text(review(attempts.running));

    const html = review(attempts.running);
    expect(plain).toContain('Started 3 hours ago. $0.40 of the $5 limit spent so far.');
    expect(plain).toContain("The agent's summary isn't ready yet. It shows here when the agent is done.");
    expect(plain).toContain('Our checks have not run yet.');
    expect(plain).toContain('The diff is not available yet.');
    expect(panel(html, 'activity')).toBe('active');
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
    expect(html).toMatch(/<details data-panel="approval" class=/);
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

  it('a fork sync refused for upstream’s workflow changes links the fork, where the user syncs it', () => {
    const html = review(
      clocked(
        { state: 'REVIEW' },
        {
          step: 'SYNC',
          fork: 'octo-cat/driftwood',
          syncBranch: 'develop',
          steps: [
            { step: 'FORK', startedAt: '2026-10-28T11:59:50.000Z', doneAt: '2026-10-28T11:59:51.000Z' },
            { step: 'SYNC', startedAt: '2026-10-28T11:59:51.000Z', doneAt: null },
          ],
          lastError: {
            reason: 'sync_workflows',
            note: 'Open your fork on GitHub, click Sync fork and Update branch, then approve again here.',
            at: NOW.toISOString(),
          },
        },
      ),
    );

    expect(html).toContain('data-step="SYNC" data-step-state="failed"');
    expect(html).toMatch(/href="https:\/\/github.com\/octo-cat\/driftwood\/tree\/develop"[^>]*data-fork-sync/);
    expect(text(html)).toContain('Open your fork on GitHub ↗');
    expect(text(html)).toContain('Try again');
  });

  it('any other refusal shows no fork link', () => {
    const html = review(
      clocked(
        { state: 'REVIEW' },
        {
          fork: 'octo-cat/driftwood',
          lastError: { reason: 'branch_conflict', note: 'Delete the branch.', at: NOW.toISOString() },
        },
      ),
    );

    expect(html).not.toContain('data-fork-sync');
  });

  it("refused at the pull request by the repository's organization: where to ask it, and that Try again waits on it", () => {
    const html = review(
      clocked(
        { state: 'REVIEW' },
        {
          step: 'PULL_REQUEST',
          steps: [
            { step: 'FORK', startedAt: '2026-10-28T11:59:50.000Z', doneAt: '2026-10-28T11:59:51.000Z' },
            { step: 'PUSH', startedAt: '2026-10-28T11:59:51.000Z', doneAt: '2026-10-28T11:59:55.000Z' },
            { step: 'PULL_REQUEST', startedAt: '2026-10-28T11:59:55.000Z', doneAt: null },
          ],
          lastError: {
            reason: 'org_restricted',
            note: "The repository's organization has not approved the app.",
            at: NOW.toISOString(),
          },
        },
      ),
    );

    expect(html).toContain('data-step="PULL_REQUEST" data-step-state="failed"');
    expect(text(html)).toContain("The repository's organization has not approved the app.");
    expect(html).toContain('data-org-access');
    expect(text(html)).toContain('Try again');
    expect(text(html)).toContain('It goes through only once the organization approves the app.');
    expect(text(html)).not.toContain('Allow on GitHub');
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
    ['prOpen', 'OPEN', 'PR #1419 open', 'Waiting for review'],
    ['merged', 'MERGED', 'PR #1419 merged', 'merged 5 minutes ago'],
    ['closed', 'CLOSED', 'PR #1419 closed', 'closed without merging'],
  ] as const)(
    'links the pull request once it exists, in the header and its session: %s',
    (name, prState, title, words) => {
      const html = review(attempts[name]);
      const plain = text(html);
      const header = text(html.slice(html.indexOf('<header'), html.indexOf('</header>')));

      expect(html).toContain(`data-pr-state="${prState}"`);
      expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419"');
      expect(header).toContain('Pull request #1419');
      expect(plain).not.toContain('on GitHub ↗');
      expect(plain).toContain(title);
      expect(header).toContain(words);
      // A closed pull request shows no checks.
      if (name === 'closed') expect(header).not.toContain('Checks failed');
    },
  );

  it('says the access level above an attempt and a run, and nothing at the standard level', () => {
    expect(review(detail(), views.suspended)).toContain('data-notice="suspended"');
    expect(review(detail(), views.newAccount)).toContain('data-notice="new-account"');
    expect(review(detail())).not.toContain('data-notice');
  });

  it('says the access level in one line, its explanation under "Why?"', () => {
    const html = review(attempts.prOpen, views.newAccount);
    const notice = html.match(/<div role="status" data-notice="new-account"[^>]*>(.*?)<\/details><\/div>/)?.[0] ?? '';
    const summary = notice.match(/<summary[^>]*>(.*?)<\/summary>/)?.[1] ?? '';

    expect(notice).toContain('data-notice-line=""');
    expect(notice).toContain('<details class="group">');
    expect(notice).not.toContain(' open=""');
    expect(text(summary).trim()).toBe(
      'Smaller limits while your account is new 1 issue at a time · 3 new claims a day Why?',
    );
    expect(text(notice)).toContain('Every new account starts this way');
    expect(text(notice.slice(notice.indexOf('</summary>')))).toContain('Every new account starts this way');
  });

  it('draws a suspension and lower limits in the warning tone, the limits with their fact', () => {
    const suspended = review(attempts.prOpen, views.suspended).match(
      /<div role="status" data-notice="suspended"[^>]*>/,
    )?.[0];
    expect(suspended).toContain('border-warning/30 bg-warning-soft');
    const suspendedLine = review(attempts.prOpen, views.suspended);
    const summary = suspendedLine.slice(suspendedLine.indexOf('data-notice="suspended"'));
    expect(text(summary.match(/<summary[^>]*>(.*?)<\/summary>/)?.[1] ?? '').trim()).toBe(
      'Contribute is paused for this account Why?',
    );

    const lower = review(attempts.prOpen, views.followThrough);
    const line = lower.match(/<div role="status" data-notice="follow-through"[^>]*>/)?.[0];
    expect(line).toContain('border-warning/30 bg-warning-soft');
    expect(text(lower)).toContain('Your limits are lower for now 1 issue at a time · 3 new claims a day Why?');
  });

  it('hides nothing for a suspension: the page offers what it offers to an active account', () => {
    const page = (view: ContributeView) =>
      renderToStaticMarkup(<ReviewScreen view={view} attempt={followUpAttempts.prNeedsYou} next now={NOW} />);
    expect(page(views.active)).toContain('data-start-follow-up');
    expect(page(views.suspended)).toContain('data-start-follow-up');
  });

  describe('the header says the pull request’s state once', () => {
    const headerOf = (pr: Partial<ReturnType<typeof pullRequest>>) => {
      const html = review({ ...attempts.prOpen, pullRequest: pullRequest(pr) });
      return html.slice(html.indexOf('<header'), html.indexOf('</header>'));
    };
    const pillOf = (html: string, part: 'review' | 'checks') =>
      html.match(new RegExp(`data-pr-${part}="[A-Z_]+"><span[^>]*data-slot="badge"[^>]*class="([^"]*)"`))?.[1];

    it('marks changes requested in amber, failed or errored checks in red, an approval in green', () => {
      const changes = headerOf({ reviewDecision: 'CHANGES_REQUESTED' });
      expect(text(changes)).toContain('Changes requested');
      expect(pillOf(changes, 'review')).toContain('bg-warning-soft');

      const failed = headerOf({ checks: 'FAILURE' });
      expect(text(failed)).toContain('Checks failed');
      expect(pillOf(failed, 'checks')).toContain('bg-negative/10');
      const errored = headerOf({ checks: 'ERROR' });
      expect(text(errored)).toContain('Checks errored');
      expect(pillOf(errored, 'checks')).toContain('bg-negative/10');

      const approved = headerOf({ reviewDecision: 'APPROVED' });
      expect(text(approved)).toContain('Approved');
      expect(pillOf(approved, 'review')).toContain('bg-positive/10');
    });

    it('says a review waiting and checks running in muted words, and when it was read', () => {
      const html = headerOf({ checks: 'PENDING', syncedAt: '2026-10-28T11:48:00.000Z' });
      expect(text(html)).toContain(
        'Open · Pull request #1419 ↗ · Waiting for review · Checks running · read 12 minutes ago',
      );
      expect(pillOf(html, 'review')).toBeUndefined();
      expect(pillOf(html, 'checks')).toBeUndefined();
      expect(html).toContain('<span class="max-sm:sr-only">Pull request </span>');
    });

    it('says only when a merged or closed pull request ended, without its review, checks or read', () => {
      for (const [name, words] of [
        ['merged', 'Merged · Pull request #1419 ↗ · merged 5 minutes ago'],
        ['closed', 'Closed · Pull request #1419 ↗ · closed without merging, 5 minutes ago'],
      ] as const) {
        const html = review(attempts[name]);
        const line = text(html.slice(html.indexOf('data-pr-state'), html.indexOf('</header>')));
        expect(line).toContain(words);
        expect(line).not.toContain('read ');
        expect(html.slice(0, html.indexOf('</header>'))).not.toMatch(/data-pr-(review|checks)/);
      }
    });
  });

  describe('the header says a maintainer’s stop once', () => {
    const STOPPED = { stopped: { login: 'sam-w', at: '2026-10-28T11:04:00.000Z' }, notes: [] };

    it('as one line under the pull request’s, its why closed', () => {
      const html = renderToStaticMarkup(
        <ReviewScreen view={views.active} attempt={attempts.prOpen} now={NOW} prNotes={STOPPED} />,
      );
      const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
      const line = header.slice(header.indexOf('data-pr-stopped'));

      expect(html.match(/data-pr-stopped=""/g)).toHaveLength(1);
      expect(header.indexOf('data-pr-stopped')).toBeGreaterThan(header.indexOf('data-pr-state'));
      expect(header).toMatch(/<div data-pr-stopped=""/);
      expect(header.match(/<div [^>]*data-pr-stopped=""[^>]*>/)?.[0]).not.toContain('role=');
      expect(line).not.toContain(' open=""');
      expect(text(line.match(/<summary[^>]*>(.*?)<\/summary>/)?.[1] ?? '').trim()).toBe(
        'GitRanks work on this PR stopped sam-w · Oct 28 Why?',
      );
      expect(text(line)).toContain(
        'A maintainer of driftwood-js/driftwood stopped GitRanks work on this PR. No run, push, reply, sign-off or proof goes out from GitRanks. You can still answer on GitHub yourself. Open #1419 on GitHub ↗ (opens in a new tab)',
      );
      expect(line).toContain('href="https://github.com/driftwood-js/driftwood/pull/1419"');
    });

    it('says nothing without a stop, also where the repo said no (that stop is not the header’s)', () => {
      const saidNo = {
        ...followUpAttempts.prNeedsYou,
        needsYou: {
          since: '',
          signals: [{ kind: 'REPO_OUT' as const, at: NOW.toISOString(), detail: 'closed_no_ai' }],
        },
      };
      expect(review(attempts.prOpen)).not.toContain('data-pr-stopped');
      expect(review(saidNo)).not.toContain('data-pr-stopped');
    });

    it('sits under the line of the pull request a run follows up, when its first attempt is not known', () => {
      const html = renderToStaticMarkup(
        <ReviewScreen view={views.active} attempt={followUpAttempts.review} now={NOW} prNotes={STOPPED} />,
      );
      expect(html.indexOf('data-pr-stopped')).toBeGreaterThan(html.indexOf('data-follow-up-of'));
      expect(html.indexOf('data-pr-stopped')).toBeLessThan(html.indexOf('</header>'));
    });
  });

  it("says how long a change waits for review: 48 hours for the user's own agent's claim, seven days otherwise", () => {
    expect(text(review(detail()))).toContain('It waits seven days for you.');
    const own = detail({ runner: 'MCP', agent: { name: 'CODEX', model: null } });
    expect(text(review(own))).toContain('It waits 48 hours for you.');

    expect(text(review(stopped('REVIEW_EXPIRED')))).toContain('It waited seven days for a review, so it was let go.');
    expect(text(review({ ...stopped('REVIEW_EXPIRED'), runner: 'MCP' }))).toContain(
      'It waited 48 hours for a review, so it was let go.',
    );
    expect(text(review({ ...stopped('MCP_IDLE'), runner: 'MCP' }))).toContain(
      'Your agent made no call for 24 hours, or no passing submission for 48 hours, so the issue was let go.',
    );
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

  it('a no-go the agent wrote at the check limit reads like any no-go, with the note', () => {
    const reason = 'The renderer needs a GPU the sandbox lacks. A person with one would have to reproduce it.';
    const decided = detail({
      ...stopped('NO_GO', `${reason} Decided at the check's budget limit.`),
      checkLimit: { limit: 'budget', decided: true },
    });
    const plain = text(review(decided));
    expect(plain).toContain(END_REASONS.NO_GO);
    expect(plain).toContain(`Its reason: ${reason}`);
    expect(plain).not.toContain(`${reason} Decided at`);
    expect(plain).toContain("Decided at the check's budget limit, when the agent was told to wrap up.");
    expect(plain).not.toContain('Retry with a bigger check budget');
    // Without the field (an older API, a list): read from the detail alike.
    expect(text(review(stopped('NO_GO', `${reason} Decided at the check's time limit.`)))).toContain(
      "Decided at the check's time limit",
    );
  });

  it('no verdict by the limit: says it ran out, never a no-go, and offers one retry on a bigger budget', () => {
    const detailText =
      'No verdict: it was on "bash: cargo build" when the check\'s $0.50 budget ran out, after 19 min.';
    const ranOut = detail({
      ...stopped('NO_GO', detailText),
      checkLimit: { limit: 'budget', decided: false },
      retry: { kind: 'BOOST', takenBy: [] },
    });
    const html = review(ranOut);
    const plain = text(html);
    expect(plain).toContain('Stopped while checking the issue');
    expect(plain).toContain('Stopped: ran out of budget while checking the issue.');
    expect(plain).toContain(detailText);
    expect(plain).not.toContain('Detail: No verdict');
    expect(plain).not.toContain('decided not to go ahead');
    expect(plain).toContain('Nothing was decided about the issue');
    expect(html).toContain('data-check-limit="budget"');
    expect(plain).toContain('Retry with a bigger check budget');

    // Tried again already: the words stay, the button goes.
    expect(text(review(detail({ ...ranOut, retry: null })))).not.toContain('Retry with a bigger check budget');
    // The time limit says time; without the field it is read from the detail.
    const late = text(review(stopped('NO_GO', "No verdict before the check's 15-minute limit ran out, after 16 min.")));
    expect(late).toContain('Stopped: ran out of time while checking the issue.');
    expect(late).not.toContain('Retry with a bigger check budget');
    // A budget stop in the work is the attempt's limit, as before.
    expect(text(review(stopped('BUDGET')))).toContain(END_REASONS.BUDGET);
  });

  describe('trying a stop again', () => {
    /** The Stopped box alone (it must be there). */
    const stopBox = (html: string) => {
      const start = html.indexOf('data-attempt-status="STOPPED"');
      expect(start).toBeGreaterThan(-1);
      return html.slice(start, html.indexOf('</section>', start));
    };
    const NOTE_HINT = 'Your note comes first: the agent follows it within the rules and limits.';
    const OVERRIDE_LINE =
      'Once: a new run checks the issue again, told you overrode this no-go. You approve its pull request yourself.';
    const TAKEN_TAIL = 'may be working on this. The pull request opens under your GitHub account.';
    const withTaken = (takenBy: string[]) => detail({ ...decisionAttempts.noGo, retry: { kind: 'OVERRIDE', takenBy } });

    it('offers "Work on it anyway" on a no-go, with the note box open above it and the line under it', () => {
      const html = stopBox(review(decisionAttempts.noGo));
      const plain = text(html);
      expect(html).toContain('data-retry="OVERRIDE"');
      expect(html).toContain('data-work-anyway="A_1"');
      expect(html).not.toContain('data-retry-check');
      expect(plain).toContain('Work on it anyway');
      expect(plain).not.toContain('Retry with a bigger check budget');
      expect(plain).toContain(OVERRIDE_LINE);
      expect(plain).toContain('A note for the agent (optional)');
      expect(html).toContain('placeholder="Why go ahead? For example: the maintainer invited anyone, not one person."');
      expect(plain).toContain(NOTE_HINT);
      expect(plain).toContain('0 / 2,000');
      expect(html).toContain('rows="3"');
      // The note comes before the button; the pool line stays as it is.
      expect(html.indexOf('data-follow-up-note')).toBeLessThan(html.indexOf('Work on it anyway'));
      expect(plain).toContain('The issue went back to the pool.');
    });

    it('warns who may be on a taken issue: one login, three, or someone', () => {
      expect(text(stopBox(review(decisionAttempts.noGo)))).toContain(`@mira-k ${TAKEN_TAIL}`);
      const three = stopBox(review(withTaken(['mira-k', 'octocat', 'hubot'])));
      expect(three).toContain('data-taken-warning="3"');
      expect(text(three)).toContain(`@mira-k, @octocat and @hubot ${TAKEN_TAIL}`);
      expect(text(stopBox(review(withTaken(['mira-k', 'octocat']))))).toContain(`@mira-k and @octocat ${TAKEN_TAIL}`);
      const nobody = stopBox(review(withTaken([])));
      expect(nobody).toContain('data-taken-warning="0"');
      expect(text(nobody)).toContain(`Someone ${TAKEN_TAIL}`);
      // Under the override's line.
      expect(three.indexOf('data-taken-warning')).toBeGreaterThan(
        three.indexOf('You approve its pull request yourself.'),
      );
    });

    it('warns only over a taken no-go', () => {
      for (const release of ['too_big', null, undefined]) {
        const html = review(
          detail({ ...withTaken(['mira-k']), goNoGo: { ...decisionAttempts.noGo.goNoGo!, release } }),
        );
        expect(html).toContain('data-work-anyway="A_1"');
        expect(html).not.toContain('data-taken-warning');
        expect(text(html)).not.toContain(TAKEN_TAIL);
      }
    });

    it('keeps the bigger check budget as it was, now with the note box, and no taken warning', () => {
      const html = stopBox(
        review(detail({ ...decisionAttempts.ranOut, goNoGo: { ...decisionAttempts.noGo.goNoGo!, release: 'taken' } })),
      );
      const plain = text(html);
      expect(html).toContain('data-retry="BOOST"');
      expect(html).toContain('data-retry-check="A_1"');
      expect(html).not.toContain('data-work-anyway');
      expect(plain).toContain('Retry with a bigger check budget');
      expect(plain).toContain(
        'Once: the agent checks the issue again with twice the budget and time, as your limits allow.',
      );
      expect(plain).not.toContain('Work on it anyway');
      expect(plain).toContain('A note for the agent (optional)');
      expect(plain).toContain(NOTE_HINT);
      expect(html).not.toContain('data-taken-warning');
    });

    it('offers nothing when the stop cannot be tried again, or the API does not say', () => {
      for (const attempt of [
        detail({ ...decisionAttempts.noGo, retry: null }),
        detail({ ...decisionAttempts.noGo, retry: undefined }),
        detail({ ...decisionAttempts.noGo, retry: { kind: 'SOMETHING_NEW' as never, takenBy: [] } }),
      ]) {
        const html = review(attempt);
        expect(html).not.toContain('data-retry=');
        expect(html).not.toContain('data-follow-up-note');
        expect(text(html)).not.toContain('Work on it anyway');
      }
    });
  });

  it("shows what the agent did above the tabs, and the Stopped box leaves the no-go's reason to it", () => {
    const noGo = review(decisionAttempts.noGo);
    const plain = text(noGo);
    expect(noGo).toContain('data-go-no-go="no_go"');
    expect(plain).toContain('What the agent did No-go Someone else is on this one');
    expect(plain).not.toContain('Its reason:');
    expect(plain).not.toContain('Go or no-go');
    expect(plain.match(/Someone else is on this one/g)).toHaveLength(1);
    expect(noGo.indexOf('data-panel="agent-did"')).toBeGreaterThan(-1);
    expect(noGo.indexOf('data-panel="agent-did"')).toBeLessThan(noGo.indexOf('data-session-tabs'));

    const wentHtml = review(decisionAttempts.went);
    const went = text(wentHtml);
    expect(went).toContain('What the agent did Done Low risk');
    expect(went).toContain("The agent's notes Checked the layout cache");
    expect(went).toContain('Why it went ahead: Reproduced it');
    // The go's reason only behind the notes.
    const notes = wentHtml.slice(
      wentHtml.indexOf('data-agent-notes'),
      wentHtml.indexOf('</details>', wentHtml.indexOf('data-agent-notes')),
    );
    expect(text(wentHtml.replace(notes, '')).match(/Reproduced it/g)).toBeNull();

    const ranOut = review(decisionAttempts.ranOut);
    expect(ranOut).toContain('data-agent-text="ran_out"');
    expect(text(ranOut)).not.toContain('Stopped at the $0.60 check limit');
    expect(text(ranOut).match(/No verdict: it was on/g)).toHaveLength(1);

    // A follow-up's brief sits behind its notes.
    const run = text(
      renderToStaticMarkup(
        <ReviewScreen
          view={views.active}
          attempt={decisionAttempts.followUp}
          first={followUpAttempts.underWay}
          now={NOW}
        />,
      ),
    );
    expect(run).toContain("The agent's notes Read the review and the failing check.");
    // An older run: no card, and the box keeps the reason.
    const older = review(stopped('NO_GO', 'needs a design decision'));
    expect(older).not.toContain('data-panel="agent-did"');
    expect(text(older)).toContain('Its reason: needs a design decision');
  });

  it('a go that ended says its reason, the box saying why it stopped', () => {
    const html = review(
      detail({
        ...stopped('BUDGET'),
        goNoGo: { verdict: 'go', reason: 'Reproduced it.', decidedAtLimit: null, at: '2026-10-28T09:15:00.000Z' },
        brief: null,
      }),
    );
    const plain = text(html);
    expect(plain).toContain('What the agent did Go Reproduced it.');
    expect(plain.match(/It reached your limit for one attempt before the fix was done\./g)).toHaveLength(1);
    expect(panel(html, 'activity')).toBe('active');
  });

  it("shows a decision at the check's cap, a follow-up's no-go and a blank reason once each", () => {
    const goNoGo = { ...decisionAttempts.noGo.goNoGo!, decidedAtLimit: 'budget' as const };
    const atCap = text(review({ ...decisionAttempts.noGo, checkLimit: { limit: 'budget', decided: true }, goNoGo }));
    expect(atCap.match(/Decided at the check's budget limit/g)).toHaveLength(1);
    expect(atCap.match(/Someone else is on this one/g)).toHaveLength(1);

    const followUpNoGo = text(
      renderToStaticMarkup(
        <ReviewScreen
          view={views.active}
          attempt={{
            ...followUpAttempts.stopped,
            endReason: 'NO_GO',
            endDetail: `${goNoGo.reason} Decided at the check's budget limit.`,
            goNoGo,
            brief: goNoGo.reason,
          }}
          first={followUpAttempts.underWay}
          now={NOW}
        />,
      ),
    );
    expect(followUpNoGo).not.toContain('Its reason:');
    expect(followUpNoGo.match(/Someone else is on this one/g)).toHaveLength(1);
    expect(followUpNoGo.match(/Decided at the check's budget limit/g)).toHaveLength(1);

    const blank = text(review({ ...decisionAttempts.noGo, goNoGo: { ...goNoGo, reason: '' }, brief: null }));
    expect(blank).toContain('What the agent did No-go The agent gave no reason.');
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
      endReason: 'NO_GO',
      endDetail: "No verdict before the check's $1.00 budget ran out, after 19 min.",
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
    expect(html).toContain('data-row="review"');
    expect(html).toContain('href="/contribute/attempts/A_1"');
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
