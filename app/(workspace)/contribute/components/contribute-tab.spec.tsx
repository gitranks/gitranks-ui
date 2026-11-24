import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/contribute/actions', () => ({}));
vi.mock('@/lib/workspace/issue-actions', () => ({}));
vi.mock('@/lib/workspace/start/start-page.actions', () => ({}));
vi.mock('@/lib/workspace/fair-use.actions', () => ({}));

const { ContributeTabScreen } = await import('./contribute-tab');
const { issuePage } = await import('@/lib/contribute/__fixtures__/contribute-overview');
const { activityOf, runOf } = await import('@/lib/contribute/__fixtures__/agent-runs');
const { NOW, limits, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { blockNotice, fairUse, fairUseBlocked, fairUseNotice, noFairUse, rulesBanner } = await import(
  '@/lib/contribute/__fixtures__/fair-use'
);
const { looksToday } = await import('@/lib/workspace/__fixtures__/masked-issue');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

const TOTALS = { open: 2, merged: 7, closed: 4, reposHelped: 6 };

const render = (props: Partial<ComponentProps<typeof ContributeTabScreen>> = {}) => {
  const html = renderToStaticMarkup(
    <ContributeTabScreen
      view={views.active}
      agents={{ hosted: true, own: true }}
      learnOpen
      tab={{ totals: TOTALS, hostedLevel: 'MANUAL' }}
      page={issuePage}
      activity={activityOf()}
      counts={{ prBound: 1 }}
      query={{}}
      now={NOW}
      {...props}
    />,
  );
  return { html, plain: text(html) };
};

describe('the Contribute tab', () => {
  it('heads every state with its title, How Contribute works and the line on what it does', () => {
    const { html, plain } = render();
    expect(plain).toContain(
      'Contribute How Contribute works → Your agent fixes open-source issues that fit your stack, you review every change, and the pull request opens in your name.',
    );
    expect(html).toContain('href="/contribute/about"');
  });

  it("shows four numbers of Contribute's own pull requests, each opening the Pull requests tab filtered to them", () => {
    const { html, plain } = render();
    expect(plain).toContain(
      '7 pull requests merged 2 open, waiting on maintainers 6 repos helped 64% merged, of those decided',
    );
    expect(html).toContain('href="/my/pull-requests?state=merged&amp;made=contribute"');
    expect(html).toContain('href="/my/pull-requests?state=open&amp;made=contribute"');
    expect(html).toContain('href="/my/pull-requests?made=contribute"');
    // Nothing answered: dashes, still links.
    const none = render({ tab: { totals: null, hostedLevel: null } });
    expect(none.plain).toContain('– pull requests merged – open, waiting on maintainers – repos helped –');
    expect(none.html.match(/href="\/my\/pull-requests\?/g)).toHaveLength(4);
    // Nothing decided yet: no percent.
    expect(render({ tab: { totals: { ...TOTALS, merged: 0, closed: 0 }, hostedLevel: null } }).plain).toContain(
      '– merged, of those decided',
    );
  });

  it('shows Right now only while a Contribute run is at work', () => {
    expect(render().html).not.toContain('data-right-now');
    const working = render({ activity: activityOf(runOf({ mode: 'FIX' })) });
    expect(working.html).toContain('data-right-now="fix"');
    expect(working.plain).toContain('Right now 1 agent working All runs →');
    expect(working.plain).toContain('Hosted agent on your Claude key · Sonnet 5.5 1 of 1 at a time');
    // A Learn run is the Learn tab's.
    expect(render({ activity: activityOf(runOf({ mode: 'LEARN', runner: 'MCP' })) }).html).not.toContain(
      'data-right-now',
    );
  });

  it('heads the issues with the line for the agents and the level, the count, What you work on, How picks work and Filters', () => {
    const { html, plain } = render();
    expect(html).toContain('id="issues"');
    expect(plain).toContain(
      'Issues for you Pick an issue and press Start. The hosted agent can also start the next one by itself: set that on the Agent tab .',
    );
    expect(plain).toContain('4 open issues match your languages and topics · picked 1 hour ago · What you work on');
    expect(html).toContain('href="/my/settings/work"');
    expect(plain).toContain('How picks work');
    expect(html).toContain('data-filters="0"');
    expect(render({ tab: { totals: null, hostedLevel: 'NEXT' } }).plain).toContain(
      'The hosted agent also starts the next one by itself; change that on the Agent tab',
    );
    expect(render({ agents: { hosted: false, own: true } }).plain).toContain(
      'Issues for you Pick an issue and press Start. 4 open issues',
    );
    expect(render({ agents: { hosted: false, own: false } }).plain).toContain(
      'Pick an issue and press Start: the next page connects your agent. Or add a Claude key on the Agent tab',
    );
  });

  it('lists the issues as rows, the first Start the primary button, with "Show 10 more" while more are left', () => {
    const { html, plain } = render({ page: { ...issuePage, total: 38, next: 'c2' } });
    expect(html.match(/<article data-issue=/g)).toHaveLength(4);
    expect(html.match(/data-start-control="menu"/g)).toHaveLength(4);
    expect(html.match(/bg-primary text-primary-foreground/g)).toHaveLength(1);
    expect(html.match(/data-row-menu=""/g)).toHaveLength(4);
    expect(plain).toContain('Showing 4 of 38 issues Show 10 more');
    // No page addresses any more.
    expect(html).not.toContain('after=');
  });

  it('at the open pull request limit: its notice over the rows, no Start, the menu kept, no line about Start', () => {
    const { html, plain } = render({ counts: { prBound: 3 } });
    expect(html).toContain('data-limit-notice="3"');
    expect(plain).toContain('3 of your pull requests are waiting on maintainers.');
    expect(html).not.toContain('data-start-control');
    expect(html.match(/data-row-menu=""/g)).toHaveLength(4);
    expect(html).not.toContain('data-intro');
    // An override above the setting holds.
    const view = { ...views.active, contributor: { ...views.active.contributor!, limits: limits.openPrsSet } };
    expect(render({ view, counts: { prBound: 3 } }).html).not.toContain('data-limit-notice');
  });

  // Why, and the way on, is the Start's refusal (the key: issue-list.spec) and the Agent tab's key notice.
  it('has no Resume: a paused account sees its rows with their Start', () => {
    const { html, plain } = render({ view: views.paused });
    expect(html).not.toContain('data-list-note="paused"');
    expect(plain).not.toContain('Resume');
    expect(html).toContain('data-start-control');
  });

  it("leaves a held account's notice to the list", () => {
    expect(render({ view: views.suspended, page: null }).html).not.toContain('data-notice="suspended"');
  });

  it('holds an account GitRanks holds: no issues, no Start, a way to write to us', () => {
    const { html, plain } = render({ view: views.suspended, page: null });
    expect(plain).toContain(
      'No issues for now Contribute is paused for this account, so no issues are shown. Write to us',
    );
    expect(html).toContain('href="mailto:hello@gitranks.com"');
    expect(html).not.toContain('data-start-control');
    expect(html).not.toContain('data-filters');
    expect(html).not.toContain('data-ranking');
  });

  it('says each empty state with its one next step', () => {
    const computed = { items: [], next: null, total: 0, computedAt: '2026-10-28T07:00:00.000Z' };
    const none = render({ page: computed });
    expect(none.plain).toContain(
      'No issues match what you work on. New picks arrive every day. Change what you work on',
    );
    const filtered = render({ page: computed, query: { kind: 'DOCS' } });
    expect(filtered.plain).toContain('No issues match these filters Clear the filters');
    expect(filtered.html).toContain('href="/contribute#issues"');
    const ranking = render({ page: { items: [], next: null, total: 0, computedAt: null } });
    expect(ranking.html).toContain('data-ranking="waiting"');
    const unanswered = render({ page: undefined });
    expect(unanswered.plain).toContain('Issues are not available right now. Try again in a minute. Try again');
  });
});

describe('the Contribute tab and fair use', () => {
  // A link inside a sentence leaves a space before the full stop after it in the plain text.
  const joined = (plain: string) => plain.replace(/ ([.,])/g, '$1');

  it('draws exactly as before while the API sends no messages', () => {
    const before = render().html;
    expect(render({ fairUse: noFairUse }).html).toBe(before);
    expect(render({ fairUse: null }).html).toBe(before);
    expect(before).not.toContain('data-fair-use');
  });

  it("says the day's full issues and what they are made of, over the count", () => {
    const masked = { looks: looksToday(), numbers: null };
    const { html, plain } = render({ masked });
    expect(html).toContain('data-looks-long-line');
    expect(plain).toContain(
      'Issues for you You can see 20 full issues a day: your GitRanks tier (Skilled) gives 20, and every pull request merged through GitRanks adds 5, up to 100. 17 left today.',
    );
    expect(plain).not.toContain('You see your top');
  });

  it('says no line about the day when it cannot be read', () => {
    const { html } = render({ masked: { looks: null, numbers: null } });
    expect(html).not.toContain('data-looks-long-line');
  });

  it('shows the Terms banner with its link to the rule and a close button', () => {
    const { html, plain } = render({ fairUse: fairUse({ rulesBanner }) });
    expect(html).toContain('data-fair-use="rules"');
    expect(html).toContain('data-fair-use-banner="info"');
    expect(plain).toContain(
      'We updated our Terms of service GitRanks Contribute has a new rule. By continuing to use Contribute you agree to it. Read the new rule',
    );
    expect(html).toContain('href="/terms#contribute-rules"');
    expect(html).toContain('aria-label="Close"');
    expect(html.indexOf('data-fair-use="rules"')).toBeLessThan(html.indexOf('<h1'));
  });

  it('shows a message with its pull request, Answer, the Terms and a close button', () => {
    const { html, plain } = render({ fairUse: fairUse({ notices: [fairUseNotice()] }) });
    expect(html).toContain('data-fair-use="notice"');
    expect(html).toContain('data-fair-use-banner="warning"');
    expect(joined(plain)).toContain(`A message from GitRanks ${fairUseNotice().text} Answer Terms of service`);
    expect(html).toContain('href="https://github.com/acme/widgets/pull/412"');
    expect(html).toContain('href="/contribute/answer/583231-outsidePr-1-1"');
    expect(html).toContain('aria-label="Close"');
  });

  it('blocked by a rule: the block’s message that cannot be closed, and the held list’s way on is its answer page', () => {
    const { html, plain } = render({
      view: fairUseBlocked,
      page: null,
      fairUse: fairUse({ notices: [blockNotice], block: blockNotice }),
    });
    expect(html.match(/data-fair-use="/g)).toHaveLength(1);
    expect(html).toContain('data-fair-use="block"');
    expect(html).not.toContain('aria-label="Close"');
    expect(joined(plain)).toContain(`A message from GitRanks ${blockNotice.text} Answer Terms of service`);
    expect(html).not.toContain('data-notice="suspended"');
    expect(plain).toContain('No issues for now Contribute is paused for this account, so no issues are shown. Answer');
    expect(html).not.toContain('mailto:');
    expect(plain).not.toContain('looks automated');
  });
});
