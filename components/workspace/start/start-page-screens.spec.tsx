import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/my/start/driftwood-js/driftwood/934',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/lib/workspace/actions', () => ({}));

const { StartPageScreen, RESTART_HINT } = await import('./start-page-screen');
const { AgentConnectView } = await import('@/components/workspace/agent/agent-connect');
const { fixAttemptOf, START_GOAL, START_REF, startConnection, startViews } = await import(
  '@/lib/workspace/start/__fixtures__/start-page'
);
const { startBackOf } = await import('@/lib/workspace/start/start-page');

import type { StartMode } from '@/lib/workspace/start/start-page.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

const NOW = new Date('2026-10-28T12:00:00.000Z');
const ISSUE_URL = 'https://github.com/driftwood-js/driftwood/issues/934';
const noop = () => {};

const connectSteps = (
  <AgentConnectView
    embedded
    client="claude-code"
    onClient={noop}
    stage="none"
    shown={null}
    os="mac"
    detectedOs="mac"
    onOs={noop}
    onCreate={noop}
    onAdded={noop}
    onReopen={noop}
    onReplace={noop}
  />
);

const screen = (mode: StartMode, props: Partial<ComponentProps<typeof StartPageScreen>> = {}) => {
  const html = renderToStaticMarkup(
    <StartPageScreen
      issueRef={START_REF}
      mode={mode}
      issue={startViews.open}
      goal={mode === 'lesson' ? START_GOAL : null}
      connection={startConnection}
      connect={connectSteps}
      fix={null}
      onCheckAgain={noop}
      back={startBackOf(mode)}
      frame="tabs"
      now={NOW}
      {...props}
    />,
  );
  return { html, plain: text(html) };
};

describe('the Start page, Fix it', () => {
  it('shows the issue, then the three steps, with the Fix prompt and its page opening', () => {
    const { html, plain } = screen('fix');
    expect(plain).toContain('Issues for you');
    expect(html).toContain('href="/contribute#issues"');
    expect(plain).toContain(
      'Fix this issue Your agent fixes this issue on your computer. You review the change here, then approve the pull request. Nothing reaches GitHub before you approve.',
    );
    expect(plain).not.toContain('Learn ');
    expect(plain).toContain('driftwood-js/driftwood Issue #934');
    expect(html).toContain(`href="${ISSUE_URL}"`);
    expect(plain).toContain('TypeScript Size small');
    expect(plain).toContain('Route params lose their type after a redirect');
    expect(plain).toContain('Why it was picked: A small fix in the router your goal is about');
    expect(plain).not.toContain('Your lesson will be written');
    expect(plain).toContain('1 · Connect your agent Done Claude Code is connected. Its last call was 1 minute ago.');
    expect(plain).toContain(
      '2 · Paste this in Claude Code In a terminal, in any folder. Your agent forks the project and fixes the issue.',
    );
    expect(plain).toContain(`Fix ${ISSUE_URL} with GitRanks`);
    expect(plain).not.toContain('GitRanks Learn');
    expect(plain).toContain('Copy the prompt');
    expect(html).toContain('data-contribute-source="contribute_start_copy"');
    expect(plain).not.toContain('Just fix it');
    expect(plain).toContain('3 · This issue’s page opens Waiting for Claude Code');
    expect(plain).toContain('You can close it: the work shows under Right now on the Contribute tab.');
    expect(plain).toContain('Nothing after a few minutes? Check your agent’s connection · Pick another issue');
    expect(html).toContain('data-start-page="waiting"');
  });

  it("with VS Code connected, says the prompt goes in VS Code's chat, not a terminal", () => {
    const { plain } = screen('fix', { connection: { ...startConnection, client: 'vscode' } });
    expect(plain).toContain(
      "2 · Paste this in VS Code In VS Code's chat, in Agent mode. Your agent forks the project and fixes the issue.",
    );
    expect(plain).not.toContain('In a terminal');
  });

  it("shows owner/repo#n when GitHub's title was not read, and goes on", () => {
    const { html, plain } = screen('fix', { issue: startViews.untitled });
    expect(html).toContain('data-start-issue="unread"');
    expect(plain).toContain('driftwood-js/driftwood#934');
    expect(plain).not.toContain('Size small');
    expect(html).toContain('data-start-page="waiting"');
  });

  it('keeps step 1 to connect under a refusal, and hides steps 2 and 3', () => {
    const { html, plain } = screen('fix', { issue: startViews.taken, connection: null });
    expect(html).toContain('data-connect-mode="embedded"');
    expect(html).toContain('data-start-refusal="TAKEN"');
    expect(plain).toContain("Someone else's agent took this issue. Issues for you →");
    expect(plain).not.toContain('2 · ');
  });

  it('draws the limit in its one notice, and a note to us for an account GitRanks holds', () => {
    const limit = screen('fix', { issue: startViews.limitPrs });
    expect(limit.html).toContain('data-limit-notice="2"');
    expect(limit.plain).toContain('2 of your pull requests are waiting on maintainers.');
    const held = screen('fix', { issue: startViews.accountPaused });
    expect(held.html).toContain('href="mailto:hello@gitranks.com"');
  });

  it('after 30 minutes says so, with Check again', () => {
    const { html, plain } = screen('fix', { timedOut: true });
    expect(html).toContain('data-start-page="timeout"');
    expect(plain).toContain(
      'Nothing from your agent yet. Check that it is connected, or paste the prompt again. Check again',
    );
  });
});

describe('the Start page with a lesson', () => {
  it('marks Learn, says the lesson and its goal, gives the Learn prompt and the way out of the lesson', () => {
    const { html, plain } = screen('lesson');
    expect(plain).toContain('Back to the issues');
    expect(html).toContain('href="/learn/earlier#issues"');
    expect(plain).toContain(
      'Learn Fix this issue and learn from it Your agent fixes this issue on your computer and also writes a lesson on the fix.',
    );
    expect(plain).toContain('Your lesson will be written for: TypeScript, Some · Change');
    expect(html).toContain('href="/my/settings/goal"');
    expect(plain).not.toContain('Why it was picked');
    expect(plain).toContain('Your agent forks the project, fixes the issue and writes your lesson.');
    expect(plain).toContain(`Fix ${ISSUE_URL} with GitRanks Learn and teach me`);
    expect(html).toContain('data-contribute-source="learn_start_copy"');
    expect(plain).toContain('Only want the pull request? Just fix it, no lesson');
    expect(html).toContain('href="/my/start/driftwood-js/driftwood/934"');
    expect(plain).toContain('3 · Your lesson page opens');
    expect(plain).toContain('You can close it: the Learn tab links your lesson as soon as your agent takes the issue.');
    expect(plain).not.toContain(RESTART_HINT);
  });

  it('writes for a general reader without a saved goal, and offers to set one', () => {
    const { plain } = screen('lesson', { goal: null });
    expect(plain).toContain('Your lesson will be written for a general reader. Set your goal');
  });

  it('says to restart an agent that may have the old tool list, under the prompt and with a Fix claim', () => {
    expect(screen('lesson', { restartHint: true }).plain).toContain(RESTART_HINT);
    expect(screen('lesson', { restartHint: true, fix: fixAttemptOf('RUNNING') }).plain).toContain(RESTART_HINT);
    // Never in Fix mode.
    expect(screen('fix', { restartHint: true }).plain).not.toContain(RESTART_HINT);
  });

  it('words a Fix claim, and leaves no prompt once its pull request is open', () => {
    const running = screen('lesson', { fix: fixAttemptOf('RUNNING') });
    expect(running.html).toContain('data-start-fix="RUNNING"');
    expect(running.html).toContain('href="/my/pull-requests/driftwood-js/driftwood/934"');
    expect(running.plain).not.toContain('Pick another issue →');
    const open = screen('lesson', { fix: fixAttemptOf('PR_OPEN') });
    expect(open.plain).toContain('Pick another issue →');
    expect(open.plain).not.toContain('Just fix it');
    expect(open.plain).toContain('2 · Paste one prompt in your agent Not for this issue: pick another one.');
  });

  it('links the lesson in progress', () => {
    const { html, plain } = screen('lesson', { issue: startViews.ownInProgress });
    expect(plain).toContain('Your lesson on “Keep trailing comments when formatting match arms” is in progress.');
    expect(html).toContain('href="/my/pull-requests/by-attempt/A_3?view=lesson"');
  });
});

describe('the Start page as a part of another page', () => {
  it('draws a first section and numbers the steps after it from 2, dimmed and inert when locked', () => {
    const { html, plain } = screen('lesson', {
      issue: null,
      connection: null,
      connect: null,
      firstSection: <section data-first="">1 · Sign in</section>,
      locked: true,
      frame: 'flow',
      card: { goalLine: 'Your lesson will be written for your saved goal: Rust' },
    });
    expect(plain).toContain('1 · Sign in');
    expect(plain).toContain('2 · Connect your agent');
    expect(plain).toContain('3 · Paste one prompt in your agent');
    expect(plain).toContain('4 · Your lesson page opens');
    expect(html).toContain('data-start-locked=""');
    expect(html).toMatch(/<div inert=""/);
    // No back link row of its own.
    expect(plain).not.toContain('Back to the issues');
    // Nothing read: the issue it was handed.
    expect(plain).toContain('The issue you picked Issue #934 ↗');
    expect(plain).toContain('Your lesson will be written for your saved goal: Rust');
  });

  it("takes the card's repo and title over a read", () => {
    const { plain } = screen('fix', { issue: null, card: { repo: 'acme/router', title: 'A title it knows' } });
    expect(plain).toContain('acme/router Issue #934');
    expect(plain).toContain('A title it knows');
  });
});
