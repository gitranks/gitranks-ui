import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/my/pull-requests/acme/widgets/42',
  useSearchParams: () => new URLSearchParams('session=next'),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => ({
  loadContribute: vi.fn(),
  loadAttempt: vi.fn(),
}));
const { ProofPreview } = await import('./proof-preview');
const { ProofSection } = await import('./proof-section');
const { AgentConnectView } = await import('@/components/workspace/agent/agent-connect');
const { NOW, mcpToken, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { nextForProof, proofResult, proofSession, proofAsk } = await import('@/lib/contribute/__fixtures__/needs-you');

import type { ContributeAttemptDetail, ContributeView } from '@/lib/workspace/contribute.types';

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

/** The pull request page's proof section, for a first attempt. */
const section = (first: ContributeAttemptDetail, view: ContributeView = connected) => {
  const html = renderToStaticMarkup(<ProofSection view={view} first={first} now={NOW} />);
  return { html, plain: text(html) };
};

describe("the proof card, on the pull request's page", () => {
  it('A: asks to connect the agent first, from the connect page that shows the proof prompt', () => {
    const { html, plain } = section(nextForProof.notConnected, views.active);
    expect(html).toContain('id="proof"');
    expect(html).toContain('data-move="proof"');
    expect(plain).toContain('Prove the fix on your machine');
    expect(plain).toContain('clawsweeper · blocks the merge');
    expect(html).toContain('href="/my/agent/connect?proof=A_OC"');
    expect(plain).toContain('Connect your agent →');
    expect(plain).toContain('Add it on GitHub yourself ↗');
  });

  it('B: shows the one-line prompt for any agent once one has called, with the note sent back', () => {
    const { plain } = section(nextForProof.connected);
    expect(plain).toContain('Run the proof prompt in your agent');
    expect(plain).toContain('Prove openclaw/openclaw#190186 for GitRanks');
    expect(plain).toContain('Waiting for your agent…');
    const noted = {
      ...nextForProof.connected,
      proof: {
        ask: proofAsk(),
        session: proofSession({ state: 'WAITING', sendBack: { note: 'Capture the log too' } }),
      },
    };
    expect(section(noted).plain).toContain('Your note goes with it: Capture the log too');
  });

  it('D: shows the proof as it will be posted, and Post waits for the tick', () => {
    const { html, plain } = section(nextForProof.review);
    expect(html).toContain('data-move="proof-review"');
    expect(plain).toContain('Check the proof, then post it');
    expect(html).toContain('src="/api/me/contribute/proofs/PF_1/files/1"');
    expect(plain).toContain("I've checked it: nothing private is left");
    expect(html).toMatch(
      /<button[^>]*disabled=""[^>]*data-proof-post=""|<button[^>]*data-proof-post=""[^>]*disabled=""/,
    );
  });

  it('a proof the page cannot show offers send back, never post', () => {
    const unknown = {
      ...nextForProof.review,
      proof: { ask: proofAsk(), session: proofSession({ state: 'REVIEW', result: proofResult({ section: null }) }) },
    };
    const { plain } = section(unknown);
    expect(plain).toContain("The proof can't be shown");
    expect(plain).toContain('Send back to your agent');
    expect(plain).not.toContain('Post the proof');
  });

  it("E: the agent's reason and its reply to edit", () => {
    const cannot = section(nextForProof.cannot);
    expect(cannot.plain).toContain("Your agent couldn't capture the proof");
    expect(cannot.plain).toContain('Post the reply');
  });

  it('F: a failed post offers the retry', () => {
    const failed = section(nextForProof.failed);
    expect(failed.html).toContain('data-move="proof-failed"');
    expect(failed.plain).toContain('Posting the proof failed');
    expect(failed.plain).toContain('Try again');
  });

  it('draws nothing while there is no proof to give', () => {
    expect(section(nextForProof.posted).html).toBe('');
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
    expect(waiting).not.toContain('Find me an open-source issue to work on with GitRanks.');

    const done = text(renderToStaticMarkup(<AgentConnectView {...props} connected />));
    expect(done).toContain('Your agent is connected. Taking you back to PR #190186…');
  });
});
