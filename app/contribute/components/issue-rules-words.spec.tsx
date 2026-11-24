import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/workspace/preview-gate', () => ({ contributeShown: vi.fn(async () => true) }));
vi.mock('@/lib/learn/learn.data', () => ({}));
vi.mock('@/components/workspace/scroll-to-hash', () => ({ ScrollToHash: () => null }));
vi.mock('@/components/header/header', () => ({ Header: () => null }));

const { LaunchedTerms, TermsScreen } = await import('@/app/terms/terms');
const { McpDocsScreen } = await import('./mcp-docs');
const { FaqScreen } = await import('./faq');
const { agentsDocOf } = await import('@/lib/contribute/agents-doc');
const { MCP_DOC_LIMITS } = await import('@/lib/contribute/mcp-docs');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

describe('the Terms', () => {
  it('carry the rules for issues from GitRanks at their anchor, dated 24 November 2026', async () => {
    const html = renderToStaticMarkup(await LaunchedTerms());
    const plain = text(html);
    expect(html).toContain('id="contribute-rules"');
    expect(plain).toContain('Last updated 24 November 2026');
    expect(html).toContain('dateTime="2026-11-24"');
    expect(plain).toContain(
      'Issues from GitRanks. GitRanks reads millions of open issues, with its own rules and with AI, and keeps about one in a thousand.',
    );
    expect(plain).toContain('A list shows each issue with the details that name it hidden.');
    expect(plain).toContain('it is held for you alone for a short time, so you can decide whether to work on it.');
    expect(plain).toContain('Do not copy, pass on or publish what you saw.');
    expect(plain).toContain('It comes from your GitRanks tier and the pull requests merged through GitRanks');
    expect(plain).toContain(
      'An issue counts, given back or not, each time you see one in full, your agent takes one, you start one, or the hosted agent picks one for you.',
    );
    expect(plain).toContain(
      'the first time we email you, the second time you can see 5 full issues a day for 7 days, and the third time your access to real issues on GitRanks is closed.',
    );
    expect(plain).toContain(
      'at 20 issues for each pull request we email you, at 40 you can see 5 full issues a day until pull requests catch up, and at 60 your access is closed.',
    );
    expect(plain).toContain('ask us to look again with the form on GitRanks, or write to hello@gitranks.com');
    expect(plain).toContain(
      'Your agent must follow the rules for issues from GitRanks too: GitRanks tells it so when it connects.',
    );
    expect(plain).toContain('Each brings an email first, then 5 full issues a day, then your access to real issues');
    expect(plain).not.toContain('Pull requests for issues from your list.');
    expect(plain).not.toContain('your list gets shorter');
    expect(plain).not.toContain('could not be loaded');
  });

  it('use none of the words the rules leave behind', () => {
    const plain = text(renderToStaticMarkup(<TermsScreen contribute />));
    const rules = plain.slice(plain.indexOf('Issues from GitRanks.'), plain.indexOf('Your key, your usage.'));
    expect(rules).not.toMatch(/claim|—|issues are hidden/i);
  });
});

describe('the MCP docs', () => {
  it('list full issues a day, without issues shown or smaller limits', () => {
    const plain = text(renderToStaticMarkup(<McpDocsScreen />));
    expect(plain).toContain(
      'Full issues a day From your GitRanks tier, 10 to 70, plus 5 for each pull request merged through GitRanks, up to 100.',
    );
    expect(plain).toContain('An issue stays held');
    expect(plain).toContain('Under a fair-use warning you can see 5 full issues a day.');
    expect(plain).not.toContain('Issues shown for the first time');
    expect(plain).not.toContain('New claims');
    expect(plain).not.toContain('gets smaller limits');
  });

  it('list the limits in their order', () => {
    expect(MCP_DOC_LIMITS.map(({ what }) => what)).toEqual([
      'Requests',
      'Tool calls',
      'find_issues',
      'Full issues a day',
      'submit_patch calls',
      'start_proof calls',
      'An issue stays held',
      'Personal tokens',
    ]);
  });
});

describe('the questions', () => {
  it('ask why issue details are hidden, after fairness to maintainers', () => {
    const html = renderToStaticMarkup(<FaqScreen />);
    const plain = text(html);
    expect(plain).toContain('Why are issue details hidden, and how many issues can I see in full?');
    expect(plain).toContain('Press "See the full issue" and it is held for you alone for 15 minutes');
    expect(plain).toContain('Seeing one costs no money, and it counts toward the day, given back or not.');
    expect(html.indexOf('id="full-issues"')).toBeGreaterThan(html.indexOf('id="fair"'));
    expect(html).toContain('href="/terms#contribute-rules"');
  });
});

describe('the agents’ page', () => {
  it('links the rules in the Terms, and lists full issues a day', () => {
    const doc = agentsDocOf(null);
    expect(doc).toContain('- Terms, the rules for issues from GitRanks: https://gitranks.com/terms#contribute-rules');
    expect(doc).toContain('- Full issues a day: From your GitRanks tier');
    expect(doc).not.toContain('Issues shown for the first time');
    expect(doc).not.toContain('could not be loaded');
  });
});
