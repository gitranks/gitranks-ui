import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { ContributeTabData } from './contribute-tab';

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

const { ContributeTabScreen, pickedLineOf } = await import('./contribute-tab');
const { issuePage } = await import('@/lib/contribute/__fixtures__/contribute-overview');
const { activityOf } = await import('@/lib/contribute/__fixtures__/agent-runs');
const { NOW, limits, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { blockNotice, fairUse, fairUseBlocked, fairUseNotice, noFairUse, rulesBanner } = await import(
  '@/lib/contribute/__fixtures__/fair-use'
);
const { agentRead, homeRead, needsYouRow } = await import('@/lib/contribute/__fixtures__/wave-4-parts');
const { looksToday } = await import('@/lib/workspace/__fixtures__/masked-issue');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

const render = (props: Partial<ContributeTabData> = {}) => {
  const html = renderToStaticMarkup(
    <ContributeTabScreen
      view={views.active}
      agents={{ hosted: true, own: true }}
      home={homeRead({ agent: agentRead({ key: true }) })}
      activity={activityOf()}
      page={issuePage}
      counts={{ prBound: 1 }}
      now={NOW}
      {...props}
    />,
  );
  return { html, plain: text(html) };
};

/** The part of the page between two marks, as a person reads it. */
const between = (html: string, from: string, to?: string) =>
  text(html.slice(html.indexOf(from), to ? html.indexOf(to) : undefined));

describe('pickedLineOf', () => {
  it('says when the list was picked while it is known, and leaves the time out otherwise', () => {
    expect(pickedLineOf('2026-10-28T11:00:00.000Z', NOW)).toBe(
      'Picked for your languages and topics, 1 hour ago. See one in full before you decide.',
    );
    expect(pickedLineOf(null, NOW)).toBe('For your languages and topics. See one in full before you decide.');
    expect(pickedLineOf(undefined, NOW)).toBe('For your languages and topics. See one in full before you decide.');
  });
});

describe('Contribute home', () => {
  it('names the page for screen readers only, then the three boxes, the issues and the two lines, in that order', () => {
    const { html } = render();
    expect(html).toContain('<h1 class="sr-only">Contribute</h1>');
    const order = ['data-home-boxes', 'id="issues"', 'data-home-foot'].map((mark) => html.indexOf(mark));
    expect(order.every((at) => at > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('draws the boxes from their read: a pull request that needs the person lights the first', () => {
    const { html } = render({ home: homeRead({ needsYou: [needsYouRow()], agent: agentRead({ key: true }) }) });
    expect(html.match(/data-home-box="/g)).toHaveLength(3);
    expect(html).toMatch(/data-lit=""[^>]*data-home-box="needs-you"|data-home-box="needs-you"[^>]*data-lit=""/);
    expect(html).toContain('href="/my/pull-requests/harbor-kit/relay/512"');
  });

  it('on the first day sends the lit button to the issues below', () => {
    const { html } = render({ home: homeRead({ firstDay: true, agent: agentRead({ key: true }) }) });
    expect(html).toContain('href="#issues"');
  });

  it('has no number tiles, no Right now, no filters and no "How picks work"', () => {
    const { html, plain } = render();
    for (const gone of ['data-tile', 'data-right-now', 'data-filters', 'data-intro', 'data-looks-long-line']) {
      expect(html).not.toContain(gone);
    }
    expect(plain).not.toContain('How picks work');
    expect(plain).not.toContain('Filters');
  });

  it('heads the issues with when they were picked and What you work on', () => {
    const { html, plain } = render();
    expect(plain).toContain(
      'Issues for you Picked for your languages and topics, 1 hour ago. See one in full before you decide.',
    );
    expect(html).toContain('href="/my/settings/work"');
    expect(between(html, 'id="issues"', 'data-issue-list')).toContain('What you work on');
  });

  it("says the day's full issues left in one short line, with a tip on how the limit is worked out", () => {
    const { html, plain } = render({ masked: { looks: looksToday(), numbers: null } });
    expect(html).toContain('data-looks-short-line');
    expect(plain).toContain('17 of 20 full issues left today.');
    expect(html).toContain('aria-label="How your daily limit is worked out"');
    // The long explanation is the tip's, not the page's.
    expect(plain).not.toContain('your GitRanks tier');
  });

  it('says no short line when none are left, or when the day cannot be read', () => {
    expect(render({ masked: { looks: looksToday({ left: 0 }), numbers: null } }).html).not.toContain(
      'data-looks-short-line',
    );
    expect(render({ masked: { looks: null, numbers: null } }).html).not.toContain('data-looks-short-line');
  });

  it('lists the issues as rows, with "Show 10 more" while more are left', () => {
    const { html, plain } = render({ page: { ...issuePage, total: 38, next: 'c2' } });
    expect(html.match(/<article data-issue=/g)).toHaveLength(4);
    expect(plain).toContain('Showing 4 of 38 issues Show 10 more');
  });

  it('ends with a line about Learn and a quieter one on where the rest lives', () => {
    const { html } = render();
    const foot = html.slice(html.lastIndexOf('<', html.indexOf('data-home-foot')));
    expect(text(foot)).toBe(
      'Want to understand the fixes your agent makes? GitRanks Learn teaches what each fix uses, a lesson at a time. The model, the spend caps and the key are on the Agent tab . What you work on and your limits are in Settings . How Contribute works',
    );
    expect(foot).toContain('href="/learn"');
    expect(foot).toContain('href="/my/agent"');
    expect(foot).toContain('href="/my/settings"');
    expect(foot).toContain('href="/contribute/about"');
  });

  it('at the open pull request limit: its notice over the rows, no Start, the menu kept', () => {
    const { html, plain } = render({ counts: { prBound: 3 } });
    expect(html).toContain('data-limit-notice="3"');
    expect(plain).toContain('3 of your pull requests are waiting on maintainers.');
    expect(html).not.toContain('data-start-control');
    expect(html.match(/data-row-menu=""/g)).toHaveLength(4);
    // An override above the setting holds.
    const view = { ...views.active, contributor: { ...views.active.contributor!, limits: limits.openPrsSet } };
    expect(render({ view, counts: { prBound: 3 } }).html).not.toContain('data-limit-notice');
  });

  it('holds an account GitRanks holds: no issues, no Start, no lines about the picks, a way to write to us', () => {
    const { html, plain } = render({
      view: views.suspended,
      page: null,
      masked: { looks: looksToday(), numbers: null },
    });
    expect(plain).toContain(
      'No issues for now Contribute is paused for this account, so no issues are shown. Write to us',
    );
    expect(html).toContain('href="mailto:hello@gitranks.com"');
    expect(html).not.toContain('data-start-control');
    expect(html).not.toContain('data-picked-line');
    expect(html).not.toContain('data-looks-short-line');
    expect(html).not.toContain('data-ranking');
  });

  it('says each empty state with its one next step', () => {
    const none = render({ page: { items: [], next: null, total: 0, computedAt: '2026-10-28T07:00:00.000Z' } });
    expect(none.plain).toContain(
      'No open issue fits what you work on right now New issues are checked every hour. Adding a language lets more of them fit. What you work on',
    );
    expect(between(none.html, 'data-list-note="none"')).toContain('What you work on');
    const ranking = render({ page: { items: [], next: null, total: 0, computedAt: null } });
    expect(ranking.html).toContain('data-ranking="waiting"');
    expect(ranking.plain).toContain(
      'We are picking your first issues It takes a few minutes. This page fills in by itself, and you can leave it open.',
    );
    const unanswered = render({ page: undefined });
    expect(unanswered.plain).toContain('Issues are not available right now. Try again in a minute. Try again');
  });
});

describe('Contribute home and fair use', () => {
  // A link inside a sentence leaves a space before the full stop after it in the plain text.
  const joined = (plain: string) => plain.replace(/ ([.,])/g, '$1');

  it('draws exactly as before while the API sends no messages', () => {
    const before = render().html;
    expect(render({ fairUse: noFairUse }).html).toBe(before);
    expect(render({ fairUse: null }).html).toBe(before);
    expect(before).not.toContain('data-fair-use');
  });

  it('shows the Terms banner above the boxes, with its link to the rule and a close button', () => {
    const { html, plain } = render({ fairUse: fairUse({ rulesBanner }) });
    expect(html).toContain('data-fair-use="rules"');
    expect(plain).toContain(
      'We updated our Terms of service GitRanks Contribute has a new rule. By continuing to use Contribute you agree to it. Read the new rule',
    );
    expect(html).toContain('href="/terms#contribute-rules"');
    expect(html).toContain('aria-label="Close"');
    expect(html.indexOf('data-fair-use="rules"')).toBeLessThan(html.indexOf('data-home-boxes'));
  });

  it('shows a message with its pull request, Answer, the Terms and a close button', () => {
    const { html, plain } = render({ fairUse: fairUse({ notices: [fairUseNotice()] }) });
    expect(html).toContain('data-fair-use="notice"');
    expect(joined(plain)).toContain(`A message from GitRanks ${fairUseNotice().text} Answer Terms of service`);
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
    expect(plain).toContain('No issues for now Contribute is paused for this account, so no issues are shown. Answer');
    expect(html).not.toContain('mailto:');
  });
});
