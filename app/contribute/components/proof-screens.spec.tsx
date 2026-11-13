import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute/attempts/A_OC',
  useSearchParams: () => new URLSearchParams('session=next'),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/app/contribute/actions', () => ({}));
vi.mock('@/lib/contribute/contribute.data', () => ({
  loadContribute: vi.fn(),
  loadAttempt: vi.fn(),
  loadResolveHumanThreads: vi.fn(async () => undefined),
}));

const { ReviewScreen } = await import('./review-view');
const { ProofPreview } = await import('./proof-preview');
const { AgentConnectView } = await import('./agent-connect');
const { NOW, mcpToken, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { nextForProof, proofResult, proofSession, proofAsk } = await import('@/lib/contribute/__fixtures__/needs-you');

import type { ContributeAttemptDetail, ContributeView } from '@/lib/contribute/contribute.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('&gt;', '>')
    .replaceAll('&lt;', '<')
    .replace(/\s+/g, ' ')
    // A code span or link ends where the sentence goes on: no space before its stop.
    .replace(/ ([.;,])/g, '$1');

const connected: ContributeView = {
  ...views.active,
  ownAgent: {
    paths: { hosted: true, mcp: true },
    tokens: [mcpToken({ lastUsedAt: '2026-10-28T10:00:00.000Z' })],
  },
};

const page = (first: ContributeAttemptDetail, view: ContributeView = connected) => {
  const html = renderToStaticMarkup(<ReviewScreen view={view} attempt={first} next now={NOW} />);
  return { html, plain: text(html) };
};

describe('the proof card', () => {
  it('A: asks to connect the agent first, from the connect page that shows the proof prompt', () => {
    const { html, plain } = page(nextForProof.notConnected, views.active);
    expect(html).toContain('data-move="proof"');
    expect(plain).toContain('Proof needed Prove the fix on your machine');
    expect(plain).toContain('clawsweeper · blocks the merge');
    expect(plain).toContain('“Add real behavior proof”');
    expect(plain).toContain('Why only you');
    expect(html).toContain('href="/contribute/connect?path=agent&amp;proof=A_OC"');
    expect(plain).toContain('Connect your agent →');
    expect(plain).toContain('gitranks-proof/190186');
    expect(plain).toContain('Add it on GitHub yourself ↗');
    expect(plain).toContain("I've done it");
    // The proof card tells the block: no found card beside it.
    expect(html).not.toContain('data-move="found"');
  });

  it('B: shows the one-line prompt for any agent once one has called, and waits for it', () => {
    const { html, plain } = page(nextForProof.connected);
    expect(plain).toContain('Proof needed Run the proof prompt in your agent');
    expect(plain).toContain('Claude Code on macOS · last used 2 hours ago');
    expect(plain).toContain('Prompt for your agent');
    expect(plain).toContain('Prove openclaw/openclaw#190186 for GitRanks');
    expect(plain).not.toContain('Prompt for Claude Code');
    expect(plain).toContain('Waiting for your agent…');
    // The proof's tile takes the next step's mark; the run's keeps its own.
    expect(html).toMatch(/data-session="next"[^>]*>\s*<a[^>]*aria-current="page"/);
    expect(html).toContain('data-session="next-run"');
  });

  it('B: carries the note the user sent back', () => {
    const first = {
      ...nextForProof.connected,
      proof: {
        ask: proofAsk(),
        session: proofSession({ state: 'WAITING', sendBack: { note: 'Capture the log too' } }),
      },
    };
    expect(page(first).plain).toContain('Your note goes with it: Capture the log too');
  });

  it('C: tells the agent at work with its lease, and offers to take it back; checking offers nothing', () => {
    const { html, plain } = page(nextForProof.working);
    // Nothing waits on the user: the next step's line, not a card.
    expect(html).toContain('data-status="proof-working"');
    expect(plain).toContain('Your agent is capturing the proof');
    expect(plain).toContain('picked up 6 minutes ago; holds it until 13:54 UTC');
    expect(plain).toContain('Take it back');

    const checking = page({
      ...nextForProof.working,
      proof: {
        ask: proofAsk(),
        session: proofSession({ state: 'CHECKING', checkError: 'slot 2: too_large' }),
      },
    }).plain;
    expect(checking).toContain('GitRanks is checking the screenshots.');
    expect(checking).toContain('The last screenshots were refused: slot 2: too_large. Your agent was told.');
    expect(checking).not.toContain('Take it back');
  });

  it('D: shows the proof as it will be posted, what gets posted, and Post waits for the tick', () => {
    const { html, plain } = page(nextForProof.review);
    expect(html).toContain('data-move="proof-review"');
    expect(plain).toContain('Check the proof Check the proof, then post it');
    expect(plain).toContain('Claude Code · 14 minutes ago: “Reproduced the lock');
    expect(html).toContain('src="/api/me/contribute/proofs/PF_1/files/1"');
    expect(html).toContain('src="/api/me/contribute/proofs/PF_1/files/2"');
    expect(html).toContain('<details');
    expect(plain).toContain('2 screenshots on the branch gitranks-proof/190186 in your fork.');
    expect(plain).toContain('A comment: @clawsweeper re-review.');
    expect(plain).toContain('Your agent says it removed 2 IP addresses, 1 API key.');
    expect(plain).toContain("I've checked it: nothing private is left");
    expect(html).toMatch(
      /<button[^>]*disabled=""[^>]*data-proof-post=""|<button[^>]*data-proof-post=""[^>]*disabled=""/,
    );
    expect(html).not.toContain('data-proof-moved-head');
  });

  it('D: says when the pull request moved on since the proof was captured', () => {
    const first = {
      ...nextForProof.review,
      proof: { session: nextForProof.review.proof?.session ?? null, ask: proofAsk(), prHeadSha: 'aa11bb22cc33' },
    };
    expect(page(first).plain).toContain('Captured on 89cc1af0; the pull request is now at aa11bb22.');
    // The ask's head is the bot's, not the pull request's now: no line without the head the last read saw.
    const askOnly = {
      ...nextForProof.review,
      proof: { session: nextForProof.review.proof?.session ?? null, ask: proofAsk({ headSha: 'aa11bb22cc33' }) },
    };
    expect(page(askOnly).html).not.toContain('data-proof-moved-head');
  });

  it('a proof the page cannot show offers send back and discard, never post; checking offers no take back', () => {
    const unknown = {
      ...nextForProof.review,
      proof: {
        ask: proofAsk(),
        session: proofSession({ state: 'REVIEW', result: proofResult({ section: null }) }),
      },
    };
    const { html, plain } = page(unknown);
    expect(html).toContain('data-move="proof-review"');
    expect(plain).toContain("Check the proof The proof can't be shown");
    expect(plain).toContain('Send back to your agent');
    expect(plain).not.toContain('Post the proof');
    expect(plain).not.toContain('Take it back');
  });

  it('a block the bot raised after the proof was posted gets the found card with its verdict', () => {
    const later = {
      ...nextForProof.posted,
      needsYou: {
        since: '2026-10-28T11:58:00.000Z',
        signals: [
          {
            kind: 'BOT_BLOCKED' as const,
            at: '2026-10-28T11:58:00.000Z',
            detail: 'clawsweeper: Needs changes before merge — 1 item remains: Rename the flag',
          },
        ],
      },
    };
    const { html, plain } = page(later);
    expect(html).toContain('data-move="found"');
    // The posted proof rides under the card in one muted line.
    expect(html).toContain('data-proof-rider="proof-posted"');
    expect(plain).toContain('Proof: Proof posted: clawsweeper reads it again');
    expect(plain).toContain('Rename the flag');
  });

  it("E: the agent's reason and its reply to edit; the fix broken offers the next run with its note", () => {
    const cannot = page(nextForProof.cannot);
    expect(cannot.plain).toContain("Check the proof Your agent couldn't capture the proof");
    expect(cannot.plain).toContain('A reply for the pull request, written by your agent');
    expect(cannot.plain).toContain('Post the reply');
    expect(cannot.plain).toContain('Try again with a note');

    const broken = page(nextForProof.fixBroken);
    expect(broken.html).toContain('data-move="proof-review"');
    expect(broken.plain).toContain("Your agent found the fix doesn't work");
    expect(broken.plain).toContain('Start run 2 with this note');
    expect(broken.plain).toContain('Make the abort path drop the queued message');
  });

  it('F: posted, with links to the description and the comment; a failed post offers the retry', () => {
    const posted = page(nextForProof.posted);
    expect(posted.html).toContain('data-status="proof-posted"');
    expect(posted.plain).toContain('Bot reads it Proof posted: clawsweeper reads it again');
    expect(posted.plain).toContain('2 screenshots on gitranks-proof/190186 in your fork');
    expect(posted.html).toContain('href="https://github.com/openclaw/openclaw/pull/190186#issuecomment-1"');

    const failed = page(nextForProof.failed);
    expect(failed.html).toContain('data-move="proof-failed"');
    expect(failed.plain).toContain('Posting failed Posting the proof failed');
    expect(failed.plain).toContain("It stopped adding the section to the pull request's description");
    expect(failed.plain).toContain('body_too_long');
    expect(failed.plain).toContain('Try again');
  });

  it('a posted reply says so, and the bot that names no command is asked on GitHub', () => {
    const reply = {
      ...nextForProof.posted,
      proof: {
        ask: proofAsk(),
        session: proofSession({
          state: 'POSTED',
          stateAt: '2026-10-28T11:56:00.000Z',
          result: proofResult({ outcome: 'CANNOT_PROVE', section: null, reply: 'Thanks', files: [] }),
          post: {
            step: 'COMMENT',
            commitSha: null,
            bodyAt: null,
            commentUrl: 'https://github.com/o/r/pull/1#c',
            error: null,
          },
        }),
      },
    };
    expect(page(reply).plain).toContain('Reply posted');
    const noCommand = {
      ...nextForProof.posted,
      proof: {
        ask: proofAsk({ reReview: null }),
        session: proofSession({
          ...nextForProof.posted.proof?.session,
          post: { step: 'BODY', commitSha: null, bodyAt: null, commentUrl: null, error: null },
        }),
      },
    };
    expect(page(noCommand).plain).toContain('clawsweeper names no command to read it again: ask it on GitHub');
  });
});

describe('the proof preview', () => {
  const preview = (markdown: string) =>
    renderToStaticMarkup(
      <ProofPreview
        proofId="PF_1"
        heading="## Evidence"
        markdown={markdown}
        files={[{ slot: 2, name: 'a.png', caption: 'A', bytes: 1, width: 1, height: 1 }]}
      />,
    );

  it("renders proof:2 as the proof's own route, and <details>", () => {
    const html = preview('![shot](proof:2)\n\n<details><summary>Log</summary>\n\nline\n\n</details>');
    expect(html).toContain('src="/api/me/contribute/proofs/PF_1/files/2"');
    expect(html).toContain('<details');
    expect(html).toContain('<summary');
  });

  it('drops a script, an outside image, a raw image, a slot it does not have, and inline handlers', () => {
    const html = preview(
      [
        '<script>alert(1)</script>',
        '![x](https://evil.example/x.png)',
        '![y](//evil.example/y.png)',
        '![z](proof:5)',
        '<img src="/api/me/contribute/proofs/PF_2/files/1">',
        '<img src="/api/me/contribute/proofs/PF_1/files/../../../x">',
        '<img src="/api/me/contribute/proofs/PF_1/files/3">',
        '<img src="proof:2" onerror="alert(1)">',
        '<a href="javascript:alert(1)">go</a>',
      ].join('\n\n'),
    );
    expect(html).not.toContain('<script');
    expect(html).not.toContain('evil.example');
    expect(html).not.toContain('PF_2');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('files/5');
    expect(html).not.toContain('files/3');
    expect(html).not.toContain('../');
  });
});

describe('the connect page, reached from a proof card', () => {
  it('shows the proof prompt as step 3, and says it goes back to the pull request', () => {
    const noop = () => {};
    const props = {
      client: 'claude-code' as const,
      onClient: noop,
      stage: 'added' as const,
      shown: null,
      os: 'mac' as const,
      detectedOs: 'mac' as const,
      onOs: noop,
      onCreate: noop,
      onAdded: noop,
      onReopen: noop,
      onReplace: noop,
      proof: { attemptId: 'A_OC', prompt: 'Prove openclaw/openclaw#190186 for GitRanks', prNumber: 190186 },
    };
    const waiting = text(renderToStaticMarkup(<AgentConnectView {...props} />));
    expect(waiting).toContain('3 · Run the proof prompt');
    expect(waiting).toContain('Prove openclaw/openclaw#190186 for GitRanks');
    expect(waiting).toContain('Prompt for your agent');
    expect(waiting).not.toContain('Find me an issue on GitRanks');

    const done = text(renderToStaticMarkup(<AgentConnectView {...props} connected />));
    expect(done).toContain('Your agent is connected. Taking you back to PR #190186…');
  });
});
