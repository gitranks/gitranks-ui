import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/workspace/preview-gate', () => ({ contributeShown: vi.fn(async () => true) }));
vi.mock('@/lib/learn/learn.data', () => ({ loadLearnOpen: vi.fn(async () => false) }));
vi.mock('@/components/workspace/scroll-to-hash', () => ({ ScrollToHash: () => null }));
vi.mock('@/components/header/header', () => ({ Header: () => null }));

const { LaunchedTerms, TermsScreen } = await import('@/app/terms/terms');
const { McpDocsScreen } = await import('./mcp-docs');
const { FaqScreen } = await import('./faq');
const { agentsDocOf } = await import('@/lib/contribute/agents-doc');
const { IssueRulesLiveDocument, issueRulesLive, resetIssueRulesLive } = await import('@/lib/workspace/rules-live');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

/** Today's API: it does not know the field yet. */
const unknownField = () =>
  Promise.reject(new Error('[{"message":"Cannot query field \\"issueNumbers\\" on type \\"Query\\"."}]'));

beforeEach(() => {
  graphqlDirect.mockReset();
  resetIssueRulesLive();
});

describe('whether the rules about full issues a day are live', () => {
  it('is read in an operation of its own, and kept a minute', async () => {
    graphqlDirect.mockResolvedValue({ issueNumbers: { rulesLive: true } });
    expect(await issueRulesLive(1_000)).toBe(true);
    expect(await issueRulesLive(30_000)).toBe(true);
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
    expect(graphqlDirect).toHaveBeenCalledWith(IssueRulesLiveDocument, undefined, { source: 'ssr' });
  });

  it('is not live while the API does not know the field, or does not answer', async () => {
    graphqlDirect.mockImplementation(unknownField);
    expect(await issueRulesLive(1_000)).toBe(false);
    resetIssueRulesLive();
    graphqlDirect.mockRejectedValue(new Error('GraphQL error! 502: Bad Gateway'));
    expect(await issueRulesLive(1_000)).toBe(false);
  });

  it('keeps the last answer when an ask fails, and asks again 10 seconds later', async () => {
    graphqlDirect.mockResolvedValueOnce({ issueNumbers: { rulesLive: true } });
    expect(await issueRulesLive(0)).toBe(true);
    graphqlDirect.mockImplementationOnce(unknownField);
    expect(await issueRulesLive(60_000)).toBe(true);
    expect(await issueRulesLive(65_000)).toBe(true);
    expect(graphqlDirect).toHaveBeenCalledTimes(2);
    graphqlDirect.mockResolvedValueOnce({ issueNumbers: { rulesLive: false } });
    expect(await issueRulesLive(71_000)).toBe(false);
  });
});

describe('the Terms', () => {
  it('keep the rule for issues from your list and its date while the API does not know the field', async () => {
    graphqlDirect.mockImplementation(unknownField);
    const html = renderToStaticMarkup(await LaunchedTerms());
    expect(text(html)).toContain('Pull requests for issues from your list.');
    expect(text(html)).not.toContain('Issues from GitRanks.');
    expect(html).toContain('2026-11-22');
  });

  it('carry the rules for issues from GitRanks once they are live, at the same anchor, with their date', async () => {
    graphqlDirect.mockResolvedValue({ issueNumbers: { rulesLive: true } });
    const html = renderToStaticMarkup(await LaunchedTerms());
    const plain = text(html);
    expect(html).toContain('id="contribute-rules"');
    expect(html).toContain('2026-11-24');
    expect(plain).toContain(
      'Issues from GitRanks. GitRanks reads millions of open issues, with its own rules and with AI, and keeps about one in a thousand.',
    );
    expect(plain).toContain('A list shows each issue with the details that name it hidden.');
    expect(plain).toContain('it is held for you alone for a short time, so you can decide whether to work on it.');
    expect(plain).toContain('Do not copy, pass on or publish what you saw.');
    expect(plain).toContain('It comes from your GitRanks tier and the pull requests merged through GitRanks');
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
    expect(plain).not.toContain('your list gets shorter');
    expect(plain).not.toContain('to claim');
  });

  it('use none of the words the rules leave behind', () => {
    const plain = text(renderToStaticMarkup(<TermsScreen contribute rulesLive />));
    const rules = plain.slice(plain.indexOf('Issues from GitRanks.'), plain.indexOf('Your key, your usage.'));
    expect(rules).not.toMatch(/claim|\u2014|issues are hidden/i);
  });
});

describe('the MCP docs', () => {
  it('list today’s limits until the rules are live', () => {
    const plain = text(renderToStaticMarkup(<McpDocsScreen />));
    expect(plain).toContain('Issues shown for the first time');
    expect(plain).toContain('A new GitHub account, or one whose claims rarely turn into pull requests');
  });

  it('list full issues a day once they are live, without issues shown or smaller limits', () => {
    const plain = text(renderToStaticMarkup(<McpDocsScreen rulesLive />));
    expect(plain).toContain(
      'Full issues a day From your GitRanks tier, 10 to 70, plus 5 for each pull request merged through GitRanks, up to 100.',
    );
    expect(plain).toContain('An issue stays held');
    expect(plain).toContain('Under a fair-use warning you can see 5 full issues a day.');
    expect(plain).not.toContain('Issues shown for the first time');
    expect(plain).not.toContain('New claims');
    expect(plain).not.toContain('gets smaller limits');
  });
});

describe('the questions', () => {
  it('ask why issue details are hidden only once the rules are live, after fairness to maintainers', () => {
    expect(text(renderToStaticMarkup(<FaqScreen />))).not.toContain('Why are issue details hidden');
    const html = renderToStaticMarkup(<FaqScreen rulesLive />);
    const plain = text(html);
    expect(plain).toContain('Why are issue details hidden, and how many issues can I see in full?');
    expect(plain).toContain('Press "See the full issue" and it is held for you alone for 15 minutes');
    expect(plain).toContain('Seeing one costs no money, and it counts toward the day, given back or not.');
    expect(html.indexOf('id="full-issues"')).toBeGreaterThan(html.indexOf('id="fair"'));
    expect(html).toContain('href="/terms#contribute-rules"');
  });
});

describe('the agents’ page', () => {
  it('links the rules in the Terms, and lists today’s limits until they are live', () => {
    const doc = agentsDocOf(null);
    expect(doc).toContain('- Terms, the rules for issues from GitRanks: https://gitranks.com/terms#contribute-rules');
    expect(doc).toContain('- Issues shown for the first time: 150 a day');
    expect(agentsDocOf(null, { rulesLive: true })).toContain('- Full issues a day: From your GitRanks tier');
    expect(agentsDocOf(null, { rulesLive: true })).not.toContain('Issues shown for the first time');
  });
});
