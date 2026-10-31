import { print } from 'graphql';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute/settings',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/app/contribute/actions', () => ({}));
vi.mock('@/lib/contribute/contribute.data', () => ({
  loadContribute: vi.fn(),
  loadContributeSet: vi.fn(),
  loadIssues: vi.fn(),
}));

const { SettingsScreen } = await import('./settings-view');
const { WorkSettingsScreen } = await import('./settings-pages');
const { IssuesScreen } = await import('./issues-view');
const { FeedbackForm } = await import('./feedback-dialog');
const { Dialog } = await import('@/components/ui/dialog');
const { ContributeIssuesDocument, IssuesForProfileDocument } = await import('@/lib/contribute/contribute.documents');
const { NOW, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { fullReposSet, resolve, smallReposSet, stackSet } = await import(
  '@/lib/contribute/__fixtures__/contribute-sets'
);

import type { ContributeIssue, ContributeSet } from '@/lib/contribute/contribute.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

const settings = (set?: ContributeSet | null) =>
  renderToStaticMarkup(<WorkSettingsScreen view={views.active} now={NOW} set={set} />);

/** Whether the radio pill with this label is the checked one. */
const checked = (html: string, label: string) => new RegExp(`<input[^>]*checked=""[^>]*>${label}`).test(html);
const unchecked = (html: string, label: string) => new RegExp(`<input(?![^>]*checked="")[^>]*>${label}`).test(html);

/** The markup of the list row for one repo. */
const rowOf = (html: string, repo: string) => {
  const start = html.indexOf(`data-repo="${repo}"`);
  return start < 0 ? '' : html.slice(start, html.indexOf('</li>', start));
};

describe('Settings, what to work on', () => {
  it('sums up what you work on in one row of Settings, opening its page', () => {
    const html = renderToStaticMarkup(<SettingsScreen view={views.active} now={NOW} set={stackSet()} />);
    const row = html.slice(
      html.indexOf('href="/contribute/settings/work"'),
      html.indexOf('</a>', html.indexOf('href="/contribute/settings/work"')),
    );

    expect(text(row)).toContain('Support my stack · 50 libraries from');
    expect(html).not.toContain('id="rules"');
    expect(html).not.toContain('id="ignored"');
  });

  it('opens its page with what to work on, the preferences, the rules and the ignored repos', () => {
    const html = settings(stackSet());
    const panels = ['modes', 'work', 'rules', 'ignored'].map((id) => html.indexOf(`id="${id}"`));
    expect(panels.every((at) => at >= 0)).toBe(true);
    expect([...panels].sort((a, b) => a - b)).toEqual(panels);
    expect(html).toContain('href="/contribute/settings"');
    expect(html.match(/id="work"/g)).toHaveLength(1);
    expect(text(html)).toContain('None picked: every language the pool has. Applies in every mode.');
  });

  it('says when what you work on did not load, and shows the rest as usual', () => {
    const html = renderToStaticMarkup(<WorkSettingsScreen view={views.active} now={NOW} set={undefined} setFailed />);

    expect(text(html)).toContain("Your lists didn't load. Reload the page to try again");
    expect(html).toContain('id="work"');
    expect(text(html)).not.toContain('How we pick repos');

    const summary = renderToStaticMarkup(<SettingsScreen view={views.active} now={NOW} set={undefined} setFailed />);
    expect(text(summary)).toContain("Your lists didn't load. Reload the page to try again");
    expect(summary).toContain('href="/contribute/settings/budget"');
  });

  it('keeps the mode radios enabled while a change saves, so focus stays on them', () => {
    const html = settings(stackSet());
    const radios = [...html.matchAll(/<input[^>]*type="radio"[^>]*>/g)].map(([tag]) => tag);

    expect(radios.length).toBeGreaterThan(3);
    expect(radios.filter((tag) => tag.includes('disabled'))).toEqual([]);
  });

  it('offers three modes as radios, the active one checked', () => {
    const all = settings(stackSet());
    const html = all.slice(all.indexOf('id="modes"'), all.indexOf('id="rules"'));
    const radios = [...html.matchAll(/<input[^>]*type="radio"[^>]*>/g)]
      .map(([tag]) => tag)
      .filter((tag) => /value="(STACK|REPOS|ALL)"/.test(tag));

    expect(radios).toHaveLength(3);
    expect(radios.filter((tag) => tag.includes('checked=""'))).toEqual([expect.stringContaining('value="STACK"')]);
    for (const title of ['Support my stack', 'Support these repos', 'All issues']) expect(text(html)).toContain(title);
  });

  it("Stack: the sources by how they were added, the libraries they use, and what happens when they're empty", () => {
    const html = settings(stackSet());
    const plain = text(html);

    expect(plain).toContain("Your stack's sources");
    expect(html).toContain('data-count="3"');
    expect(plain).toContain('3 / 50 repos');
    expect(html).toContain('data-group="@me"');
    expect(html).toContain('data-group="acme-corp"');
    expect(rowOf(html, 'octocat/site')).toContain('Reading');
    expect(rowOf(html, 'octocat/resize-detector')).toContain('Read');
    expect(plain).toContain('@me My repos added');

    expect(plain).toContain("Libraries we'll work on");
    expect(plain).toContain('412 packages in your sources → the 50 libraries most of them use');
    expect(plain).toContain('Updated 4 minutes ago');
    expect(plain).toContain('Refresh');
    expect(rowOf(html, 'facebook/react')).toContain('used by 12');
    expect(text(rowOf(html, 'facebook/react'))).toContain('react, react-dom, scheduler');
    expect(text(rowOf(html, 'nestjs/nest'))).toContain('@nestjs/core, @nestjs/common, @nestjs/config, +2');
    expect(text(rowOf(html, 'nestjs/nest'))).toContain('Reading');
    expect(plain).toContain('Show all 50');
    expect(plain).toContain("Didn't pass the rules · 2");
    expect(plain).toContain('No outside PR merged in 90 days');
    expect(plain).toContain('Language not supported yet · 2');
    expect(plain).toContain("38 packages have no GitHub repo linked, so we can't follow them.");

    expect(plain).toContain('When these libraries have nothing ready');
    expect(checked(html, 'Work on all issues meanwhile')).toBe(true);
    expect(unchecked(html, 'Wait for new issues')).toBe(true);
  });

  it('Stack: says while the libraries are worked out, and offers Try again when that failed', () => {
    const resolving = settings(
      stackSet({ stack: { ...stackSet().stack, resolve: resolve({ state: 'RESOLVING', endedAt: null }) } }),
    );
    expect(resolving).toContain('data-targets="RESOLVING"');
    expect(text(resolving)).toContain('Working out your libraries… started 5 minutes ago');
    expect(text(resolving)).not.toContain('Refresh');

    const failed = text(settings(stackSet({ stack: { ...stackSet().stack, resolve: resolve({ state: 'FAILED' }) } })));
    expect(failed).toContain("Couldn't update them: showing the last ones");
    expect(failed).toContain('Try again');

    const none = text(settings(stackSet({ stack: { sources: [], count: 0, fallback: 'THEN_ALL', resolve: null } })));
    expect(none).toContain("Add your repos above, and we'll work out the libraries they use.");
    expect(none).toContain('No repos yet.');
  });

  it('Repos: a full list with its meter, failed and greyed repos, and only these', () => {
    const html = settings(fullReposSet());
    const plain = text(html);

    expect(plain).toContain('Repos you support');
    expect(plain).toContain('50 / 50 repos');
    expect(html).toContain('aria-label="50 of 50 repos on the list"');
    expect(html).toContain('data-group="vercel"');
    expect(plain).toContain('vercel · 2 repos · added just now');
    expect(plain).toContain('nodejs · 49 repos · added Oct 26');
    expect(plain).toContain('Show 44 more');
    expect(plain).toContain('Single repos · 1 repo');

    const failed = text(rowOf(html, 'nodejs/undici'));
    expect(failed).toContain("Didn't pass: maintainers asked us not to send PRs");
    expect(failed).toContain('Suggest a change');
    expect(failed).not.toContain('Ignore');
    const greyed = rowOf(html, 'JetBrains/kotlin');
    expect(greyed).toContain('opacity-60');
    expect(text(greyed)).toContain('Language not supported yet · not counted');
    expect(text(greyed)).not.toContain('Ignore');

    expect(plain).toContain('When these repos have nothing ready');
    expect(checked(html, 'Wait for new issues')).toBe(true);
    expect(plain).toContain('Your agent works only on these repos');
    expect(plain).not.toContain("Libraries we'll work on");
  });

  it('All issues: no list to edit', () => {
    const plain = text(settings(stackSet({ mode: 'ALL' })));

    expect(plain).toContain('What to work on');
    expect(plain).not.toContain("Your stack's sources");
    expect(plain).not.toContain('Repos you support');
    expect(plain).not.toContain('have nothing ready');
  });

  it('explains both sets of rules, with Suggest a change', () => {
    const plain = text(settings(stackSet()));

    expect(plain).toContain('At least one PR from outside the team merged in 90 days');
    expect(plain).toContain('A dependency file GitHub can read');
    expect(plain).toContain('A commit in the last 12 months');
    expect(plain).toContain('we check every repo for new issues every 12 hours');
    expect(plain).toContain('Suggest a change');
  });

  it('lists the ignored repos with Unignore, and turns Ignore off when the list is full', () => {
    const html = settings(stackSet());
    expect(text(html)).toContain('Ignored repos');
    expect(html).toContain('aria-label="Unignore eslint/eslint"');
    expect(text(html)).toContain('3 / 50');

    const ignore = Array.from({ length: 50 }, (_, index) => ({
      repositoryId: `I_${index}`,
      nameWithOwner: `old/repo-${index}`,
      at: '2026-10-20T09:00:00.000Z',
    }));
    const full = settings(stackSet({ ignore }));
    expect(text(full)).toContain('Your ignore list is full (50): unignore a repo first to ignore another.');
    expect(rowOf(full, 'facebook/react')).toMatch(/disabled=""[^>]*title="Your ignore list is full \(50\)/);
  });

  it('shows nothing about the modes when they are not shown to the user', () => {
    for (const set of [undefined, null]) {
      const html = settings(set);
      const plain = text(html);

      expect(plain).not.toContain('What to work on');
      expect(plain).not.toContain('How we pick repos');
      expect(plain).not.toContain('Ignored repos');
      expect(plain).not.toContain('Applies in every mode');
      expect(plain).toContain('What you work on');
      expect(html).not.toContain('href="#modes"');
    }
  });
});

const issue = (patch: Partial<ContributeIssue>): ContributeIssue => ({
  issueId: 'I_1',
  repositoryId: 'R_1',
  nameWithOwner: 'vitest-dev/vitest',
  number: 6512,
  url: 'https://github.com/vitest-dev/vitest/issues/6512',
  title: 'toMatchInlineSnapshot breaks on nested backticks',
  labels: [],
  language: 'JS_TS',
  kind: 'BUG',
  size: 'S',
  score: 0.9,
  rank: 1,
  why: 'Your stack: vitest · used by 9 of 14 repos',
  ...patch,
});

describe('Issues for you, by mode', () => {
  const render = (
    set: ContributeSet | null | undefined,
    page: Parameters<typeof IssuesScreen>[0]['page'],
    query: Parameters<typeof IssuesScreen>[0]['query'] = {},
  ) => renderToStaticMarkup(<IssuesScreen view={views.active} page={page} query={query} now={NOW} set={set} />);
  const somePage = { items: [issue({})], next: null, total: 1, computedAt: '2026-10-28T07:00:00.000Z' };

  it('says the mode by the title, with the language filter, and a quiet way into a mode in All issues', () => {
    expect(text(render(stackSet(), somePage))).toContain('Supporting your stack · 50 libraries · Rust');
    expect(text(render(fullReposSet(), somePage))).toContain('Supporting 50 repos · only these · Rust');
    expect(
      text(render(smallReposSet({ repos: { ...smallReposSet().repos, fallback: 'THEN_ALL' } }), somePage)),
    ).toContain('Supporting 12 repos · then all issues · Rust');
    const all = render(stackSet({ mode: 'ALL' }), somePage);
    expect(all).toContain('data-mode-chip="ALL"');
    expect(text(all)).toContain('All issues · Rust');
    expect(render(undefined, somePage)).not.toContain('data-mode-chip');
  });

  it("puts the list's issues first, and the other issues under a divider", () => {
    const html = render(stackSet(), {
      ...somePage,
      items: [
        issue({ tier: 0 }),
        issue({ issueId: 'I_2', tier: 0, rank: 2 }),
        issue({ issueId: 'I_3', tier: 1, rank: 3, why: 'Outside your stack · You write JavaScript' }),
      ],
    });
    const plain = text(html);

    expect(plain.indexOf('From your stack')).toBeLessThan(plain.indexOf('Other issues for you'));
    expect(plain).toContain('Shown below your stack\'s issues, because you chose "Work on all issues meanwhile"');
    expect(html.match(/data-other="true"/g)).toHaveLength(1);
    expect(plain).toContain('Why it was picked: Your stack: vitest · used by 9 of 14 repos');
  });

  it('says the list has nothing ready when only other issues are on the first page', () => {
    const plain = text(render(stackSet(), { ...somePage, items: [issue({ tier: 1 })] }));

    expect(plain).toContain('Your list has nothing ready: other issues for you');
    expect(plain).not.toContain('From your stack');
  });

  it('shows one list, as before, while the feed has no tiers', () => {
    const html = render(stackSet(), { ...somePage, items: [issue({}), issue({ issueId: 'I_2', rank: 2 })] });

    expect(html).not.toContain('data-divider');
    expect(html).not.toContain('data-other');
  });

  it('with only the list and nothing ready: why, and two ways on', () => {
    const empty = { items: [], next: null, total: 0, computedAt: '2026-10-28T07:00:00.000Z' };
    const html = render(smallReposSet(), empty);
    const plain = text(html);

    expect(html).toContain('data-empty="set-only"');
    expect(plain).toContain('Your 12 repos have no issues ready right now');
    expect(plain).toContain(
      'We check them for new issues every 12 hours. 3 repos are still being read for the first time.',
    );
    expect(plain).toContain('Work on all issues meanwhile');
    expect(html).toContain('href="/contribute/settings/work"');
    expect(plain).toContain('Add more repos');
    expect(plain).toContain('Language filter: Rust. 12 of them are in other languages.');

    // Filters, a later page, or a list that goes on with all issues: the feed's own empty states.
    expect(render(smallReposSet(), empty, { kind: 'DOCS' })).not.toContain('data-empty="set-only"');
    expect(render(smallReposSet({ repos: { ...smallReposSet().repos, fallback: 'THEN_ALL' } }), empty)).not.toContain(
      'data-empty="set-only"',
    );
    expect(render(undefined, empty)).not.toContain('data-empty="set-only"');
  });
});

describe('the Issues page while the stack is worked out', () => {
  it('says the libraries are on their way, not that the list is empty', () => {
    const empty = { items: [], next: null, total: 0, computedAt: '2026-10-28T07:00:00.000Z' };
    const base = stackSet();
    for (const resolveState of [null, resolve({ state: 'RESOLVING', targets: [], endedAt: null })]) {
      const set = stackSet({ stack: { ...base.stack, fallback: 'SET_ONLY', resolve: resolveState } });
      const plain = text(
        renderToStaticMarkup(<IssuesScreen view={views.active} page={empty} query={{}} now={NOW} set={set} />),
      );

      expect(plain).toContain("We're working out the libraries your stack uses");
      expect(plain).toContain("We're reading the dependency files of your 3 repos.");
      expect(plain).not.toContain('Your list is empty');
    }
  });

  it("reads each issue's tier with the feed itself, and only there", () => {
    const feed = print(ContributeIssuesDocument);
    expect(feed).toMatch(/items \{[^}]*\btier\b/);
    expect(print(IssuesForProfileDocument)).not.toContain('tier');
  });
});

describe('the feedback dialog', () => {
  const render = (open: Parameters<typeof FeedbackForm>[0]['open']) =>
    renderToStaticMarkup(
      <Dialog open>
        <FeedbackForm open={open} maxChars={2000} perDay={10} onClose={() => {}} />
      </Dialog>,
    );

  it('starts on its topic, and shows what is sent along', () => {
    const html = render({
      topic: 'GATES',
      context: { mode: 'STACK', repo: 'lodash/lodash', reasons: ['OUTSIDE_MERGES'] },
    });
    const plain = text(html);

    expect(checked(html, 'The rules')).toBe(true);
    expect(unchecked(html, 'Modes and lists')).toBe(true);
    expect(unchecked(html, 'Something else')).toBe(true);
    expect(html).not.toContain('disabled=""');
    expect(html).toContain('maxLength="2000"');
    expect(plain).toContain('Up to 2,000 characters.');
    expect(plain).toContain(
      "Sent along Mode: Support my stack · Repo: lodash/lodash · Didn't pass: No outside PR merged in 90 days",
    );
    expect(plain).toContain('Send');
  });

  it('says the source rules in their own words, and sends along nothing without a context', () => {
    expect(
      text(render({ topic: 'GATES', context: { repo: 'acme/app', reasons: ['PUSHED'] }, rules: 'source' })),
    ).toContain("Didn't pass: No commits in 12 months");
    expect(render({ topic: 'OTHER', context: {} })).not.toContain('data-feedback="context"');
  });
});
