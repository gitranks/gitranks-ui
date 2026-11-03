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

describe('the MCP docs', () => {
  it('show every client the connect flow knows with the same lines, then VS Code', () => {
    expect(MCP_DOC_CLIENTS.map(({ id }) => id)).toEqual([...MCP_CLIENTS, 'vs-code']);
    for (const client of MCP_CLIENTS) {
      expect(MCP_DOC_CLIENTS.find(({ id }) => id === client)?.lines).toBe(mcpSetupLinesOf(client, 'mac'));
    }
    const vsCode = JSON.parse(MCP_DOC_CLIENTS.find(({ id }) => id === 'vs-code')?.lines ?? '{}');
    expect(vsCode.inputs[0]).toMatchObject({ type: 'promptString', password: true });
    expect(vsCode.servers.gitranks.headers.Authorization).toBe(`Bearer \${input:gitranks-token}`);
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
    expect(LANDING_QUESTIONS[0]?.id).toBe('in-beta');
  });
});

describe('the Terms', () => {
  it('carry the Contribute section, and its date, only when Contribute is shown', () => {
    const shown = text(renderToStaticMarkup(<TermsScreen contribute />));
    const hidden = text(renderToStaticMarkup(<TermsScreen contribute={false} />));
    expect(shown).toContain('GitRanks Contribute');
    expect(shown).toContain('3 November 2026');
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
    expect(open).toContain('2026-11-03');
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
