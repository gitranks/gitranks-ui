import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/contribute/preview-gate', () => ({ contributeShown: vi.fn() }));
vi.mock('./scroll-to-hash', () => ({ ScrollToHash: () => <span data-scroll-to-hash /> }));
vi.mock('@/components/header/header', () => ({ Header: () => null }));

const { FaqScreen } = await import('./faq');
const { McpDocsScreen } = await import('./mcp-docs');
const { LaunchedTerms, TermsScreen } = await import('@/app/terms/terms');
const { LaunchedMorePages } = await import('./launched-more-pages');
const { contributeShown } = await import('@/lib/contribute/preview-gate');
const { FAQ_GROUPS, LANDING_QUESTIONS } = await import('@/lib/contribute/faq');
const { MCP_DOC_CLIENTS, MCP_DOC_SAVES, MCP_DOC_TOOLS } = await import('@/lib/contribute/mcp-docs');
const { MCP_CLIENTS, mcpSetupLinesOf } = await import('@/lib/contribute/mcp-setup');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

describe('the MCP docs, sign-in first', () => {
  it('lead each client with its sign-in, its token setup in a fold; Antigravity keeps the token; claude.ai joins', () => {
    const html = renderToStaticMarkup(<McpDocsScreen />);
    const plain = text(html);
    expect(plain).toContain('GitHub, in your browser');
    expect(html).toContain('data-sign-in-start');
    expect(plain).toContain('codex mcp login gitranks');
    expect(plain).toContain('/mcp auth gitranks');
    expect(html).toContain('id="claude-app"');
    expect(plain).toContain('Add custom connector');
    expect(plain).toContain('"servers"');
    // Four agents and VS Code fold their token setup; Antigravity and claude.ai have one way only.
    expect(html.match(/data-token-fold/g)).toHaveLength(5);
    expect(html.match(/data-token-only/g)).toHaveLength(1);
    expect(plain).toContain("Antigravity can't sign in with GitHub yet, so it connects with a personal token");
    // The token steps sit in a fold of their own, after the sign-in.
    expect(html.indexOf('data-sign-in-start')).toBeLessThan(html.indexOf('data-token-start'));
  });

  it('say what a sign-in can and cannot do, how long it lasts, what is kept and how to disconnect it', () => {
    const plain = text(renderToStaticMarkup(<McpDocsScreen />));
    expect(plain).toContain('Sign-in and tokens');
    expect(plain).toContain('see the issues picked for you and claim one');
    expect(plain).toContain("It can't open a pull request, push or post on GitHub");
    expect(plain).toContain('Its access lasts an hour');
    expect(plain).toContain('Unused for 30 days, it has to sign in again.');
    expect(plain).toContain('hashes of its tokens');
    expect(plain).toContain('Disconnect there stops it at once.');
    expect(plain).not.toContain('Your token ');
  });
});

describe('the MCP docs', () => {
  it('show every client the connect flow knows with the same lines, then VS Code', () => {
    expect(MCP_DOC_CLIENTS.map(({ id }) => id)).toEqual([...MCP_CLIENTS, 'vs-code']);
    for (const client of MCP_CLIENTS) {
      expect(MCP_DOC_CLIENTS.find(({ id }) => id === client)?.lines).toBe(mcpSetupLinesOf(client, 'mac'));
    }
    const vsCode = JSON.parse(MCP_DOC_CLIENTS.find(({ id }) => id === 'vs-code')?.lines ?? '{}');
    // Copilot's portable file: no `${input:…}` prompt (VS Code marks it unsupported), the token from the environment.
    expect(vsCode.inputs).toBeUndefined();
    expect(vsCode.mcpServers.gitranks).toMatchObject({ type: 'http', url: 'https://mcp.gitranks.com/mcp' });
    expect(vsCode.mcpServers.gitranks.headers.Authorization).toBe(`Bearer \${GITRANKS_MCP_TOKEN}`);
  });

  it('save the token per OS, never with a real one', () => {
    expect(MCP_DOC_SAVES.map(({ os }) => os)).toEqual(['mac', 'linux', 'windows']);
    expect(MCP_DOC_SAVES.find(({ os }) => os === 'linux')?.line).toContain('~/.bashrc');
    for (const { line } of MCP_DOC_SAVES) expect(line).toContain('<your GitRanks token>');
  });

  it('list the ten tools, an anchor per client, the header forms and what is sent', () => {
    const html = renderToStaticMarkup(<McpDocsScreen />);
    expect(MCP_DOC_TOOLS).toHaveLength(10);
    for (const { name } of MCP_DOC_TOOLS) expect(html).toContain(name);
    for (const { id } of MCP_DOC_CLIENTS) expect(html).toContain(`id="${id}"`);
    const said = text(html);
    expect(said).toContain('Authorization: Bearer <your GitRanks token>');
    expect(said).toContain('X-GitRanks-Token: <your GitRanks token>');
    expect(said).toContain('What is sent to mcp.gitranks.com');
    expect(said).toContain('What we never ask for');
    expect(said).not.toMatch(/official|partner|endorsed/i);
  });

  it('give Antigravity the placeholder in its config, say what replaces it, and skip the variable for it', () => {
    const antigravity = MCP_DOC_CLIENTS.find(({ id }) => id === 'antigravity');
    expect(antigravity?.lines).toContain('Bearer <your GitRanks token>');
    expect(antigravity?.where).toContain('in place of <your GitRanks token>');
    expect(antigravity?.windows?.label).toBe('%USERPROFILE%\\.gemini\\config\\mcp_config.json');
    expect(text(renderToStaticMarkup(<McpDocsScreen />))).toContain(
      'On Antigravity, skip this: its setup holds the token',
    );
  });
});

describe('the questions', () => {
  it('run contribution, guardrails, credits, then the record, each question with its own anchor', () => {
    expect(FAQ_GROUPS.map(({ id }) => id)).toEqual(['contributing', 'guardrails', 'credits', 'beta']);
    const ids = FAQ_GROUPS.flatMap(({ id, entries }) => [id, ...entries.map((entry) => entry.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('give the agreed autopilot line, no cost numbers, and the landing its six', () => {
    const said = text(renderToStaticMarkup(<FaqScreen />));
    expect(said).toContain('Autopilot opens about a month after launch.');
    expect(said).not.toMatch(/\$\d+\.\d\d/);
    expect(said).not.toMatch(/farm|boost your profile|burn tokens|Claude for Open Source/i);
    expect(LANDING_QUESTIONS).toHaveLength(6);
  });

  it('say the agent signs in with GitHub, what it can and cannot do, and the token as the fallback', () => {
    const said = text(renderToStaticMarkup(<FaqScreen />));
    expect(said).toContain('How does my own agent connect?');
    expect(said).toContain('It signs in with your GitHub account.');
    expect(said).toContain("It can't open a pull request, push or post on GitHub");
    expect(said).toContain('uses a personal token you make in Settings');
    expect(said).not.toContain('revoke your tokens');
  });

  it('say the misses rule, never the retired pause', () => {
    const said = text(renderToStaticMarkup(<FaqScreen />));
    expect(said).toContain(
      'A pull request no one answers for 30 days gets you a warning, and we close it at 45 days, at least 15 days after the warning, unless you keep it open. Two misses in one repo within 90 days (no answer for 30 days, or closed as wrong, low quality or harshly) take it out of the shared pool for 90 days; a merge cancels its own miss. A maintainer who closes one saying the project takes no AI-made pull requests takes the repo out of Contribute for 90 days, one who asks us to stay away for 365.',
    );
    expect(said).toContain(
      'take a repo out of the shared pool for 90 days after two misses there within 90 days: a PR no one answers for 30 days, or one closed as wrong, low quality or harshly.',
    );
    expect(said).not.toMatch(/60 days|in a row/);
    expect(LANDING_QUESTIONS[0]?.id).toBe('in-beta');
  });
});

describe('the Terms', () => {
  it('carry the Contribute section, and its date, only when Contribute is shown', () => {
    const shown = text(renderToStaticMarkup(<TermsScreen contribute />));
    const hidden = text(renderToStaticMarkup(<TermsScreen contribute={false} />));
    expect(shown).toContain('GitRanks Contribute');
    expect(shown).toContain('11 November 2026');
    expect(hidden).toContain('31 October 2026');
    expect(shown).toContain('not affiliated with or endorsed by Anthropic');
    expect(shown).toContain('gitranks.com/contribute/maintainers');
    expect(hidden).not.toContain('Contribute');
    expect(shown).not.toContain('Claude Code');
  });
});

describe('the launch gate', () => {
  const shown = vi.mocked(contributeShown);

  it('gives the Terms their Contribute section, its date and the scroll to it only when Contribute is shown', async () => {
    shown.mockResolvedValue(true);
    const open = renderToStaticMarkup(await LaunchedTerms());
    expect(open).toContain('id="contribute"');
    expect(open).toContain('2026-11-11');
    expect(open).toContain('data-scroll-to-hash');

    shown.mockResolvedValue(false);
    const closed = renderToStaticMarkup(await LaunchedTerms());
    expect(closed).not.toContain('id="contribute"');
    expect(closed).not.toContain('data-scroll-to-hash');
    expect(text(closed)).not.toContain('Contribute');
  });

  it('shows the maintainers page the other pages only when Contribute is shown', async () => {
    shown.mockResolvedValue(true);
    expect(text(renderToStaticMarkup(await LaunchedMorePages({})))).toContain('More about Contribute');

    shown.mockResolvedValue(false);
    expect(await LaunchedMorePages({})).toBeNull();
  });
});
