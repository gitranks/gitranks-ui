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
const { SwitchSettingsScreen, WorkSettingsScreen } = await import('./settings-pages');
const { SwitchReview } = await import('./mode-switch');
const { IgnoredList, RulesContent } = await import('./set-panels');
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

/** The list's page. */
const settings = (set?: ContributeSet | null) => renderToStaticMarkup(<WorkSettingsScreen now={NOW} set={set} />);
/** The Settings summary. */
const summary = (set?: ContributeSet | null, setFailed = false) =>
  renderToStaticMarkup(<SettingsScreen view={views.active} now={NOW} set={set} setFailed={setFailed} />);
const noWrite = async () => null;

/** Whether the radio pill with this label is the checked one. */
const checked = (html: string, label: string) => new RegExp(`<input[^>]*checked=""[^>]*>${label}`).test(html);
const unchecked = (html: string, label: string) => new RegExp(`<input(?![^>]*checked="")[^>]*>${label}`).test(html);

/** The markup of the list row for one repo. */
const rowOf = (html: string, repo: string) => {
  const start = html.indexOf(`data-repo="${repo}"`);
  return start < 0 ? '' : html.slice(start, html.indexOf('</li>', start));
};

describe('Settings, what to work on', () => {
  it('shows the three modes on Settings, the current one filled, and the rest switching', () => {
    const html = summary(stackSet());
    const start = html.indexOf('aria-label="Where your issues come from"');
    const cards = html.slice(start, html.indexOf('</ul>', start));

    expect(cards).toMatch(/data-mode="STACK" data-current="true"><div aria-current="true"/);
    expect(cards).toContain('href="/contribute/settings/switch/repos"');
    expect(cards).toContain('aria-label="Switch to Support these repos"');
    expect(cards).toMatch(/<button[^>]*aria-label="Switch to All issues"/);
    for (const title of ['Support my stack', 'Support these repos', 'All issues']) expect(text(cards)).toContain(title);
    expect(text(cards)).toContain('Current');
    // Nothing switches on the summary itself: no radios, no list editor.
    expect(html).not.toMatch(/<input[^>]*type="radio"/);
    expect(html).not.toContain('data-list="SOURCES"');
  });

  it('sums up the current list, the filters and the ignored repos in rows, with how we pick repos beside them', () => {
    const html = summary(stackSet());
    const plain = text(html);

    expect(html).toContain('data-list-row="STACK"');
    expect(html).toContain('href="/contribute/settings/work"');
    expect(plain).toContain('Your stack 50 libraries from 3 repos · then all issues');
    expect(plain).toContain('Filters Rust · Bugs · any size');
    expect(html).toContain('aria-label="Edit filters"');
    expect(plain).toContain('Ignored repos 3 repos never picked, in any mode');
    expect(html).toContain('aria-label="Manage ignored repos"');
    expect(plain).toContain('How we pick repos');
    expect(text(summary(smallReposSet()))).toContain('Your repos 12 repos saved · 3 being read · only these');
    expect(summary(stackSet({ mode: 'ALL' }))).not.toContain('data-list-row');
  });

  it('opens the list on its own page, with the libraries and what happens when they have nothing ready', () => {
    const html = settings(stackSet());
    expect(html).toContain('href="/contribute/settings"');
    expect(html).toContain('data-list="SOURCES"');
    expect(html).toContain('data-targets="READY"');
    expect(html).toContain('data-fallback="THEN_ALL"');
    expect(text(html)).toContain('How we pick repos');
    expect(html).not.toContain('id="rules"');
  });

  it('says when what you work on did not load, and keeps the filters', () => {
    expect(text(settings(undefined))).not.toContain("didn't load");
    const failed = text(renderToStaticMarkup(<WorkSettingsScreen now={NOW} set={undefined} setFailed />));
    expect(failed).toContain("Your lists didn't load. Reload the page to try again");

    const html = summary(undefined, true);
    expect(text(html)).toContain("Your lists didn't load. Reload the page to try again");
    expect(text(html)).toContain('Filters Rust · Bugs · any size');
    expect(html).toContain('href="/contribute/settings/budget"');
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

  it('All issues: no list to edit, and the way to pick another mode', () => {
    const html = settings(stackSet({ mode: 'ALL' }));
    const plain = text(html);

    expect(plain).toContain('All issues has no list to edit.');
    expect(html).toContain('href="/contribute/settings"');
    expect(plain).not.toContain("Your stack's sources");
    expect(plain).not.toContain('have nothing ready');
  });

  it('explains both sets of rules in their dialog', () => {
    const plain = text(renderToStaticMarkup(<RulesContent />));

    expect(plain).toContain('At least one PR from outside the team merged in 90 days');
    expect(plain).toContain('A dependency file GitHub can read');
    expect(plain).toContain('A commit in the last 12 months');
    expect(plain).toContain('we check every repo for new issues every 12 hours');
  });

  it('lists the ignored repos with Unignore, and turns Ignore off when the list is full', () => {
    const html = renderToStaticMarkup(<IgnoredList set={stackSet()} write={noWrite} />);
    expect(html).toContain('aria-label="Unignore eslint/eslint"');
    expect(text(html)).toContain('3 / 50');

    const ignore = Array.from({ length: 50 }, (_, index) => ({
      repositoryId: `I_${index}`,
      nameWithOwner: `old/repo-${index}`,
      at: '2026-10-20T09:00:00.000Z',
    }));
    expect(text(renderToStaticMarkup(<IgnoredList set={stackSet({ ignore })} write={noWrite} />))).toContain(
      'Your ignore list is full (50): unignore a repo first to ignore another.',
    );
    const full = settings(stackSet({ ignore }));
    expect(rowOf(full, 'facebook/react')).toMatch(/disabled=""[^>]*title="Your ignore list is full \(50\)/);
  });

  it('shows nothing about the modes when they are not shown to the user', () => {
    for (const set of [undefined, null]) {
      const html = summary(set);
      const plain = text(html);

      expect(html).not.toContain('aria-label="Where your issues come from"');
      expect(plain).not.toContain('How we pick repos');
      expect(plain).not.toContain('Ignored repos');
      expect(plain).toContain('What you work on Rust · Bugs · any size');
    }
  });
});

describe('switching what you work on', () => {
  it('starts on the list it moves to, step 1 of 3, with Cancel back to Settings', () => {
    const html = renderToStaticMarkup(<SwitchSettingsScreen set={smallReposSet()} target="STACK" now={NOW} />);
    const plain = text(html);

    expect(plain).toContain('Switch to Support my stack');
    expect(plain).toContain('Your current mode goes on until you switch.');
    expect(html).toMatch(/<li aria-current="step"[^>]*>.*?1<\/span>Your stack/);
    expect(plain).toContain('When nothing is ready');
    expect(plain).toContain('Review');
    expect(html).toContain('data-list="SOURCES"');
    expect(plain).toContain('3 / 50 repos');
    expect(plain).toContain('Next');
    expect(html).toContain('href="/contribute/settings"');
  });

  it('reviews the switch: from and to, the list, what happens when it is quiet, and what is kept', () => {
    const plain = text(renderToStaticMarkup(<SwitchReview set={smallReposSet()} target="STACK" onEdit={() => {}} />));

    expect(plain).toContain('Where issues come from Support these repos → Support my stack');
    expect(plain).toContain('Your stack 3 repos');
    expect(plain).toContain('When nothing is ready Work on all issues meanwhile');
    expect(plain).toContain('Kept Your repos list (12 repos) stays saved: switch back any time.');
  });

  it('asks for at least one repo before switching to an empty list', () => {
    const html = renderToStaticMarkup(<SwitchReview set={stackSet()} target="REPOS" onEdit={() => {}} />);

    expect(html).toContain('data-review-empty');
    expect(text(html)).toContain('Add at least one repo first');
    expect(text(html)).toContain('Add repos');
  });

  it('says what the agent does while a new stack is read, by what happens when it is quiet', () => {
    const fresh = (fallback: 'THEN_ALL' | 'SET_ONLY') =>
      text(
        renderToStaticMarkup(
          <SwitchReview
            set={smallReposSet({ stack: { ...stackSet().stack, fallback, resolve: null } })}
            target="STACK"
            onEdit={() => {}}
          />,
        ),
      );
    expect(fresh('THEN_ALL')).toContain('Until then, your agent works on all issues.');
    expect(fresh('SET_ONLY')).toContain('Until then, your agent has nothing to work on, and waits.');
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
