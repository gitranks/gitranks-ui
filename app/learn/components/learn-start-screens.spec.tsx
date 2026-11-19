import type { ComponentProps, ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/learn/start/driftwood-js/driftwood/934',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/learn/actions', () => ({ readLearnStartIssue: vi.fn(), readLearnStartAttempt: vi.fn() }));
const { viewerLogin } = vi.hoisted(() => ({ viewerLogin: vi.fn(async (): Promise<string | null> => 'octocat') }));
vi.mock('@/lib/workspace/contribute.data', () => ({
  viewerLogin,
  ContributeUnavailableError: class ContributeUnavailableError extends Error {},
}));
vi.mock('@/lib/workspace/mcp-sign-in', () => ({ contributeMcpSignIn: vi.fn(async () => false) }));
const data = vi.hoisted(() => ({ loadLearnOpen: vi.fn(), loadLearnProfile: vi.fn(), loadOwnAgent: vi.fn() }));
vi.mock('@/lib/learn/learn.data', () => data);
const start = vi.hoisted(() => ({ learnStartViewOf: vi.fn(), learnStartOnboarded: vi.fn(async () => false) }));
vi.mock('@/lib/learn/learn-start.data', () => start);

const { LearnStartScreen } = await import('./learn-start-screen');
const { LearnStartView } = await import('./learn-start');
const { AgentConnectView } = await import('@/components/workspace/agent/agent-connect');
const { filledProfile, emptyProfile } = await import('@/lib/learn/__fixtures__/profile');
const { mcpToken } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { AGENT_FIRST_PROMPT } = await import('@/lib/workspace/mcp-setup');
const { fixAttemptOf, START_GOAL, START_NUMBER, START_REPO, startConnection, startViewOf, startViews } = await import(
  '@/lib/learn/__fixtures__/learn-start'
);

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

const NOW = new Date('2026-10-28T12:00:00.000Z');
const PROMPT = 'Fix https://github.com/driftwood-js/driftwood/issues/934 with GitRanks Learn and teach me';
const noop = () => {};

const connectSteps = (
  <AgentConnectView
    mode="learn"
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

const screen = (props: Partial<ComponentProps<typeof LearnStartScreen>> = {}) => {
  const html = renderToStaticMarkup(
    <LearnStartScreen
      repo={START_REPO}
      number={START_NUMBER}
      goal={START_GOAL}
      view={startViews.open}
      connection={startConnection}
      connect={connectSteps}
      fix={null}
      onCheckAgain={noop}
      now={NOW}
      {...props}
    />,
  );
  return { html, plain: text(html) };
};

describe('Start your own lesson', () => {
  it('shows the issue and the goal its lesson is written for, then the three steps', () => {
    const { html, plain } = screen();
    expect(plain).toContain('← Issues for your own lesson');
    expect(html).toContain('href="/learn"');
    expect(plain).toContain('Start your own lesson');
    expect(plain).toContain('Nothing reaches GitHub before you approve.');
    expect(plain).toContain('driftwood-js/driftwood · #934 TypeScript Size small');
    expect(plain).toContain('Route params lose their type after a redirect');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/issues/934"');
    expect(plain).toContain('Your lesson will be written for: TypeScript, Some');
    expect(html).toContain('data-learn-start-issue="read"');
  });

  it("shows owner/repo#n when GitHub's title was not read, and goes on", () => {
    const { html, plain } = screen({ view: startViews.untitled });
    expect(html).toContain('data-learn-start-issue="unread"');
    expect(plain).toContain('driftwood-js/driftwood#934');
    expect(plain).not.toContain('Size small');
    expect(plain).toContain(PROMPT);
    expect(html).toContain('data-learn-start="waiting"');
  });

  it('before the agent has called: the connect steps in step 1, steps 2 and 3 waiting their turn', () => {
    const { html, plain } = screen({ connection: null });
    expect(html).toContain('data-learn-start="connect"');
    expect(plain).toContain('About two minutes, once · no Claude key needed');
    expect(plain).toContain('1 · Connect your agent');
    expect(plain).toContain('Once per computer.');
    expect(html).toContain('data-connect-mode="learn"');
    expect(plain).not.toContain('Use your Claude key instead');
    expect(plain).not.toContain(AGENT_FIRST_PROMPT);
    expect(plain).toContain('2 · Paste one prompt in your agent Shows when your agent is connected.');
    expect(plain).toContain('3 · Your lesson page opens As soon as your agent takes the issue.');
    expect(plain).not.toContain(PROMPT);
  });

  it('once it has: step 1 done with its last call, the prompt to copy, and the wait', () => {
    const { html, plain } = screen();
    expect(html).toContain('data-learn-start="waiting"');
    expect(plain).toContain('Your agent is connected');
    expect(plain).toContain('Done');
    expect(plain).toContain('Claude Code is connected. Its last call was 1 minute ago.');
    expect(html).not.toContain('data-connect-mode');
    expect(plain).toContain('2 · Paste this in Claude Code');
    expect(plain).toContain(PROMPT);
    expect(html).toMatch(/aria-label="Copy the prompt"[^>]*data-contribute-source="learn_start_copy"/);
    expect(plain).toContain('Waiting for Claude Code');
    expect(plain).toContain('You can close it: Learn home and My lessons link your lesson');
    expect(plain).not.toContain('email');
    expect(html).toContain('href="/contribute/settings');
    expect(html).toContain('href="/learn#issues"');
  });

  it('names "your agent" when the connection does not say which, and leaves out a last call it has not made', () => {
    const { plain } = screen({ connection: { client: null, lastCallAt: null } });
    expect(plain).toContain('Your agent is connected.');
    expect(plain).not.toContain('Its last call');
    expect(plain).toContain('2 · Paste this in your agent');
    expect(plain).toContain('Waiting for your agent');
  });

  it('words a Fix attempt by its state, with its Contribute page; from a pull request on, another issue', () => {
    const running = screen({ fix: fixAttemptOf('RUNNING') });
    expect(running.html).toContain('data-learn-start="fix"');
    expect(running.html).toContain('data-learn-start-fix="RUNNING"');
    expect(running.plain).toContain(
      'Your agent took it as a regular fix, without a lesson. Ask your agent to release it, then paste the prompt again.',
    );
    expect(running.html).toContain('href="/contribute/attempts/A_9"');
    expect(running.plain).not.toContain('Pick another issue →');
    expect(running.plain).toContain(PROMPT);

    const open = screen({ fix: fixAttemptOf('PR_OPEN') });
    expect(open.plain).toContain("so it can't be a lesson. Pick another issue.");
    expect(open.plain).toContain('Pick another issue →');
    expect(open.html).toContain('href="/contribute/attempts/A_9"');
    // No prompt to paste again for this issue.
    expect(open.plain).not.toContain(PROMPT);
    expect(open.plain).toContain('2 · Paste one prompt in your agent Not for this issue: pick another one.');
  });

  it('after 30 minutes: says so, and offers Check again', () => {
    const { html, plain } = screen({ timedOut: true });
    expect(html).toContain('data-learn-start="timeout"');
    expect(plain).toContain('Nothing from your agent yet. Check that it is connected, or paste the prompt again.');
    expect(plain).toContain('Check again');
    expect(plain).not.toContain('Waiting for Claude Code');
    expect(screen({ timedOut: true, checking: true }).plain).toContain('Checking…');
    // A Fix message stays, with Check again under it.
    const fix = screen({ timedOut: true, fix: fixAttemptOf('CHECKS') });
    expect(fix.plain).toContain('Wait for its checks, then discard it on its Contribute page.');
    expect(fix.plain).toContain('Check again');
  });

  it('a refusal says why and keeps step 1 only', () => {
    for (const [view, words] of [
      [startViews.taken, "Someone else's agent took this issue. Back to the issues →"],
      [startViews.closed, 'This issue was closed meanwhile.'],
      [startViews.unavailable, "This issue can't be started here."],
      [startViews.repoUnavailable, "This project can't take a pull request from us right now."],
      [startViews.daily, "You've taken today's claims. Try again tomorrow."],
      [
        startViews.limitPrs,
        '2 of your pull requests are waiting on maintainers. A new lesson can start when one is merged or closed. My lessons →',
      ],
      [
        startViews.limitAttempts,
        'Your agent is working on another issue. A new lesson can start when that one is done. My contributions →',
      ],
      [
        startViews.ownInProgress,
        'One lesson of your own at a time: this one can start once that one is done. Back to your lesson →',
      ],
    ] as const) {
      const { html, plain } = screen({ view });
      expect(html, view.start.refusal ?? '').toContain('data-learn-start="refused"');
      expect(html).toContain(`data-learn-start-refusal="${view.start.refusal}"`);
      expect(plain).toContain(words);
      expect(plain).toContain('1 · Connect your agent');
      expect(plain).not.toContain('2 · ');
      expect(plain).not.toContain('3 · ');
      expect(plain).not.toContain(PROMPT);
    }
    expect(screen({ view: startViews.ownInProgress }).html).toContain('href="/learn/attempts/A_3"');
  });

  it("says a paused account in Contribute's words", () => {
    const { html, plain } = screen({ view: startViews.paused });
    expect(html).toContain('data-notice="paused"');
    expect(plain).toContain('Contributing is paused');
    expect(plain).not.toContain('2 · ');
  });

  it('keeps step 1 to connect under a refusal', () => {
    const { html } = screen({ view: startViews.taken, connection: null });
    expect(html).toContain('data-connect-mode="learn"');
  });
});

describe('the start page, read per request', () => {
  const params = (owner = 'driftwood-js', repo = 'driftwood', number = '934') =>
    Promise.resolve({ owner, repo, number });
  const render = async (promise = params()) =>
    renderToStaticMarkup((await LearnStartView({ params: promise })) as ReactElement);

  beforeEach(() => {
    viewerLogin.mockResolvedValue('octocat');
    data.loadLearnOpen.mockResolvedValue(true);
    data.loadLearnProfile.mockResolvedValue(filledProfile);
    data.loadOwnAgent.mockResolvedValue({
      paths: { hosted: false, mcp: true },
      tokens: [mcpToken({ lastUsedAt: '2026-10-28T11:00:00.000Z' })],
    });
    start.learnStartViewOf.mockResolvedValue({ ok: true, data: startViews.open });
    start.learnStartOnboarded.mockResolvedValue(true);
  });

  it('is not found where Learn is closed, signed out, or for an address that names no issue', async () => {
    data.loadLearnOpen.mockResolvedValueOnce(false);
    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND');
    viewerLogin.mockResolvedValueOnce(null);
    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(render(params('acme', 'router', 'x'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(start.learnStartViewOf).not.toHaveBeenCalled();
  });

  it('goes to Learn home with no saved goal, before asking about the issue', async () => {
    data.loadLearnProfile.mockResolvedValueOnce(emptyProfile);
    await expect(render()).rejects.toThrow('NEXT_REDIRECT /learn');
    data.loadLearnProfile.mockResolvedValueOnce(null);
    await expect(render()).rejects.toThrow('NEXT_REDIRECT /learn');
    expect(start.learnStartViewOf).not.toHaveBeenCalled();
  });

  it("goes on to the viewer's own Learn attempt on the issue", async () => {
    start.learnStartViewOf.mockResolvedValueOnce({ ok: true, data: startViews.yoursLesson });
    await expect(render()).rejects.toThrow('NEXT_REDIRECT /learn/attempts/A_7');
  });

  it('asks about the issue the address names, as the viewer, and shows step 1 done for an agent that has called', async () => {
    const html = await render();
    expect(start.learnStartViewOf).toHaveBeenCalledWith(
      { source: 'ssr', githubLogin: 'octocat' },
      'driftwood-js/driftwood',
      934,
    );
    expect(text(html)).toContain('Claude Code is connected.');
    expect(html).toContain('data-learn-start="waiting"');
  });

  it('shows the connect steps while no agent has called, a token made and never used not counting', async () => {
    data.loadOwnAgent.mockResolvedValueOnce({ paths: { hosted: false, mcp: true }, tokens: [mcpToken()] });
    start.learnStartOnboarded.mockResolvedValueOnce(false);
    const html = await render();
    expect(html).toContain('data-learn-start="connect"');
    expect(html).toContain('data-connect-mode="learn"');
    expect(html).toContain('data-agent-stage="added"');
  });

  it("words a Fix attempt of the viewer's on load", async () => {
    start.learnStartViewOf.mockResolvedValueOnce({ ok: true, data: startViews.yoursFix });
    const html = await render();
    expect(html).toContain('data-learn-start-fix="RUNNING"');
  });

  it("says an issue the API won't take as named can't be started; an outage is the error page", async () => {
    start.learnStartViewOf.mockResolvedValueOnce({ ok: false, error: 'INVALID' });
    expect(text(await render())).toContain("This issue can't be started here.");
    start.learnStartViewOf.mockResolvedValueOnce({ ok: false, error: 'NOT_FOUND' });
    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND');
    start.learnStartViewOf.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await expect(render()).rejects.toThrow();
    start.learnStartViewOf.mockResolvedValueOnce({ ok: false, error: 'NOT_AVAILABLE_YET' });
    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('a refusal comes with the issue it is about', async () => {
    start.learnStartViewOf.mockResolvedValueOnce({
      ok: true,
      data: startViewOf({ refusal: 'CLOSED' }),
    });
    const plain = text(await render());
    expect(plain).toContain('Route params lose their type after a redirect');
    expect(plain).toContain('This issue was closed meanwhile.');
  });
});
