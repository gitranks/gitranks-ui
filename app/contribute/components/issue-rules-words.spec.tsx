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
const { MCP_DOC_ISSUE_LIMITS, MCP_DOC_LIMITS } = await import('@/lib/contribute/mcp-docs');
const { IssueRulesLiveDocument, issueRules, issueRulesLive, resetIssueRulesLive } = await import(
  '@/lib/workspace/rules-live'
);

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

/** Today's API: it does not know the field yet. */
const unknownField = () =>
  Promise.reject(new Error('[{"message":"Cannot query field \\"termsDate\\" on type \\"IssueNumbers\\"."}]'));
/** An API that does not answer. */
const outage = () => Promise.reject(new Error('GraphQL error! 502: Bad Gateway'));
const TERMS_DATE = '2026-11-26T00:00:00.000Z';
const LIVE = { state: 'live', termsDate: TERMS_DATE } as const;
const live = { issueNumbers: { rulesLive: true, termsDate: TERMS_DATE } };

beforeEach(() => {
  graphqlDirect.mockReset();
  resetIssueRulesLive();
});

describe('which rules about issues hold', () => {
  it('is read in an operation of its own, live with the date of the Terms, and kept a minute', async () => {
    graphqlDirect.mockResolvedValue(live);
    expect(await issueRules(1_000)).toEqual(LIVE);
    expect(await issueRulesLive(30_000)).toBe(true);
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
    expect(graphqlDirect).toHaveBeenCalledWith(IssueRulesLiveDocument, undefined, { source: 'ssr' });
  });

  it("is today's while the API does not know the field, kept a minute", async () => {
    graphqlDirect.mockImplementation(unknownField);
    expect(await issueRules(1_000)).toEqual({ state: 'before' });
    expect(await issueRules(30_000)).toEqual({ state: 'before' });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
  });

  it('is not live when the API says live without a date', async () => {
    graphqlDirect.mockResolvedValue({ issueNumbers: { rulesLive: true, termsDate: null } });
    expect(await issueRules(1_000)).toEqual({ state: 'before' });
    expect(await issueRulesLive(1_000)).toBe(false);
  });

  it('is unknown, kept for nobody, while the API does not answer and no answer is kept', async () => {
    graphqlDirect.mockImplementation(outage);
    expect(await issueRules(1_000)).toEqual({ state: 'unknown' });
    expect(await issueRulesLive(1_001)).toBe(false);
    expect(graphqlDirect).toHaveBeenCalledTimes(2);
    graphqlDirect.mockResolvedValue(live);
    expect(await issueRules(1_002)).toEqual(LIVE);
  });

  it('keeps the last answer when the API does not answer, and asks again 10 seconds later', async () => {
    graphqlDirect.mockResolvedValueOnce(live);
    expect(await issueRules(0)).toEqual(LIVE);
    graphqlDirect.mockImplementationOnce(outage);
    expect(await issueRules(60_000)).toEqual(LIVE);
    expect(await issueRules(65_000)).toEqual(LIVE);
    expect(graphqlDirect).toHaveBeenCalledTimes(2);
    graphqlDirect.mockResolvedValueOnce({ issueNumbers: { rulesLive: false, termsDate: null } });
    expect(await issueRules(71_000)).toEqual({ state: 'before' });
  });
});

describe('the Terms', () => {
  it.each([
    ['does not know the field', unknownField],
    ['says live without a date', async () => ({ issueNumbers: { rulesLive: true, termsDate: null } })],
  ])('keep the rule for issues from your list and its date while the API %s', async (_, answer) => {
    graphqlDirect.mockImplementation(answer);
    const html = renderToStaticMarkup(await LaunchedTerms());
    expect(text(html)).toContain('Pull requests for issues from your list.');
    expect(text(html)).not.toContain('Issues from GitRanks.');
    expect(text(html)).toContain('Last updated 22 November 2026');
  });

  it('say the rules could not be loaded, with no date, while the API does not answer', async () => {
    graphqlDirect.mockImplementation(outage);
    const html = renderToStaticMarkup(await LaunchedTerms());
    const plain = text(html);
    expect(html).toContain('id="contribute-rules"');
    expect(plain).toContain(
      'Issues from GitRanks. This part could not be loaded just now. Reload the page to read it.',
    );
    expect(plain).toContain('Fair use of Contribute. This part could not be loaded just now.');
    expect(plain).not.toContain('Last updated');
    expect(plain).not.toContain('from your list');
    expect(plain).not.toContain('full issues a day');
  });

  it('carry the rules for issues from GitRanks once they are live, at the same anchor, with their date', async () => {
    graphqlDirect.mockResolvedValue(live);
    const html = renderToStaticMarkup(await LaunchedTerms());
    const plain = text(html);
    expect(html).toContain('id="contribute-rules"');
    expect(plain).toContain('Last updated 26 November 2026');
    expect(html).toContain('dateTime="2026-11-26"');
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
    expect(plain).not.toContain('your list gets shorter');
    expect(plain).not.toContain('to claim');
  });

  it('use none of the words the rules leave behind', () => {
    const plain = text(renderToStaticMarkup(<TermsScreen contribute rules={LIVE} />));
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
    const plain = text(renderToStaticMarkup(<McpDocsScreen rules={LIVE} />));
    expect(plain).toContain(
      'Full issues a day From your GitRanks tier, 10 to 70, plus 5 for each pull request merged through GitRanks, up to 100.',
    );
    expect(plain).toContain('An issue stays held');
    expect(plain).toContain('Under a fair-use warning you can see 5 full issues a day.');
    expect(plain).not.toContain('Issues shown for the first time');
    expect(plain).not.toContain('New claims');
    expect(plain).not.toContain('gets smaller limits');
  });

  it("build the limits of full issues a day from today's, with the rows that change swapped", () => {
    expect(MCP_DOC_ISSUE_LIMITS.map(({ what }) => what)).toEqual([
      'Requests',
      'Tool calls',
      'find_issues',
      'Full issues a day',
      'submit_patch calls',
      'start_proof calls',
      'An issue stays held',
      'Personal tokens',
    ]);
    const held = MCP_DOC_ISSUE_LIMITS.find(({ what }) => what === 'An issue stays held');
    expect(held?.limit).toBe(MCP_DOC_LIMITS.find(({ what }) => what === 'A claim lasts')?.limit);
  });

  it.each([
    ['while the read is under way, with no note', { state: 'pending' } as const, null],
    [
      'and say the rest could not be loaded while the API does not answer',
      { state: 'unknown' } as const,
      'The limits on issues could not be loaded just now. Reload the page to see them.',
    ],
  ])('list only the limits both rules share %s', (_, rules, note) => {
    const plain = text(renderToStaticMarkup(<McpDocsScreen rules={rules} />));
    expect(plain).toContain('Requests 300 a minute');
    expect(plain).toContain('Personal tokens');
    for (const gone of ['Issues shown', 'New claims', 'A claim lasts', 'Full issues a day', 'An issue stays held']) {
      expect(plain).not.toContain(gone);
    }
    expect(plain).not.toContain('gets smaller limits');
    expect(plain).not.toContain('Under a fair-use warning');
    if (note) expect(plain).toContain(note);
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
    expect(agentsDocOf(null, { rules: LIVE })).toContain('- Full issues a day: From your GitRanks tier');
    expect(agentsDocOf(null, { rules: LIVE })).not.toContain('Issues shown for the first time');
    expect(doc).not.toContain('could not be loaded');
    const unknown = agentsDocOf(null, { rules: { state: 'unknown' } });
    expect(unknown).toContain('The limits on issues could not be loaded just now.');
    expect(unknown).not.toMatch(/Issues shown for the first time|Full issues a day/);
  });
});
