import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute/attempts/A_1',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/app/contribute/actions', () => ({}));
// The fold's opener runs in the browser alone: the block says which fold it opens.
vi.mock('./open-on-hash', () => ({ OpenOnHash: ({ id }: { id: string }) => <i data-open-on-hash={id} /> }));
vi.mock('@/app/contribute/maintainers/actions', () => ({ setMaintainerConfig: vi.fn() }));
vi.mock('@/lib/contribute/contribute.data', () => ({
  loadContribute: vi.fn(),
  loadIssues: vi.fn(),
  loadAttempt: vi.fn(),
  loadResolveHumanThreads: vi.fn(async () => undefined),
}));

const { AttemptRepoRules, openRepoRules, ReposAskLessNote, RulesOpen } = await import('./repo-rules');
const { IssueRepoRules } = await import('./issue-repo-rules');
const { MaintainerRepoExtras } = await import('./maintainer-repo-extras');
const { ReviewScreen } = await import('./review-view');
const { IssueCard } = await import('./issue-card');
const { SettingsScreen } = await import('./settings-view');

import { attempts, followUpAttempts } from '@/lib/contribute/__fixtures__/contribute-attempts';
import { issue, replyWaiting } from '@/lib/contribute/__fixtures__/contribute-overview';
import { NOW, settings, views } from '@/lib/contribute/__fixtures__/contribute-views';
import { allLiveFacts, maintainerFacts, maintainerRepo } from '@/lib/contribute/__fixtures__/maintainers';
import {
  attemptNoRules,
  attemptRules,
  issueRules,
  maintainerConfig,
  maintainerRules,
} from '@/lib/contribute/__fixtures__/repo-rules';
import type { ContributeAttemptDetail, ContributeSubmitError } from '@/lib/contribute/contribute.types';
import { GITHUB_APPS_URL } from '@/lib/contribute/org-access';
import { settingsAfterSave } from '@/lib/contribute/repo-rules';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replace(/\s+/g, ' ')
    .replaceAll(' :', ':')
    .replaceAll(/ ([.,])(?=\s|$)/g, '$1');

describe('"This repo\'s rules" on the attempt (block A)', () => {
  const ORG_ACCESS = { url: GITHUB_APPS_URL, app: false };
  type Props = Parameters<typeof AttemptRepoRules>[0];
  const block = (rules: Props['rules'] = attemptRules(), props: Partial<Props> = {}) =>
    renderToStaticMarkup(
      <AttemptRepoRules
        rules={rules}
        settings={settings}
        access={null}
        org="driftwood-js"
        orgAccess={ORG_ACCESS}
        {...props}
      />,
    );
  const opened = (rules: Props['rules'] = attemptRules(), props: Partial<Props> = {}) =>
    renderToStaticMarkup(
      <RulesOpen.Provider value>
        <AttemptRepoRules
          rules={rules}
          settings={settings}
          access={null}
          org="driftwood-js"
          orgAccess={ORG_ACCESS}
          {...props}
        />
      </RulesOpen.Provider>,
    );
  const summaryOf = (html: string) => text(html.match(/<summary[^>]*>(.*?)<\/summary>/)?.[1] ?? '').trim();

  it('lists each rule in a line with its file, the limits the repo set beside the user’s, and what repos can ask', () => {
    const html = opened();
    const words = text(html);

    expect(html).toContain('data-repo-rules="listed"');
    expect(summaryOf(html)).toBe('Repo rules · 6 · 300 lines');
    expect(words).toContain("The pull request's description says why in the contributor's own words.");
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/blob/HEAD/CONTRIBUTING.md"');
    expect(words).toContain("300 changed lines the repo's, from .github/gitranks.yml · yours is 400");
    expect(words).toContain("10 files the repo's, from a maintainer's setting on gitranks.com · yours is 15");
    expect(html).toContain('href="/contribute/maintainers"');
  });

  it('keeps the repo’s words closed under the source, opened by a tap, and never says who set a value', () => {
    const html = block();
    const quotes = [...html.matchAll(/<details data-rule-quote=""[^>]*>(.*?)<\/details>/g)].map(([whole]) => whole);

    // A <details>, not a tooltip: a tap or the keyboard opens it, from the rule's own text.
    expect(quotes).toHaveLength(4);
    expect(quotes.every((quote) => !quote.includes(' open=""'))).toBe(true);
    expect(summaryOf(quotes[0])).toBe(
      "› AI-made changes need a person's review: autopilot never submits here, the contributor reviews and submits each pull request.",
    );
    expect(text(quotes[0])).toContain(
      '“Agents must not open pull requests on their own. A person reviews and submits every change.”',
    );
    expect(text(html)).not.toContain('Their words');
    expect(html).toContain('data-rule-source="AI_POLICY.md"');
    expect(html).toContain('data-rule-source="GitRanks maintainers page"');
    expect(html).not.toContain('mira-k');
  });

  it('puts a rule’s source after its quote, outside it, as an arrow named for screen readers', () => {
    const html = block();
    const rule = html.match(/<li data-rule="NO_AUTONOMOUS"[^>]*>(.*?)<\/li>/)?.[1] ?? '';
    const source = rule.slice(rule.indexOf('</details>'));

    expect(rule).toMatch(/^<details data-rule-quote=""/);
    expect(source).toContain('data-rule-source="AI_POLICY.md"');
    expect(source).toContain('title="AI_POLICY.md"');
    expect(text(source).trim()).toBe('↗ AI_POLICY.md, opens in a new tab');
  });

  it('says a repo with no rules sets none, with the user’s own limits', () => {
    const html = opened(attemptNoRules());
    const words = text(html);

    expect(summaryOf(html)).toBe('Repo rules · none · 400 lines');
    expect(words).toContain(
      'This repo sets no rules for AI contributions beyond its CONTRIBUTING. Every PR waits for your review.',
    );
    expect(words).toContain('Your limits apply: 400 changed lines, 15 files.');
  });

  it('shows only the limits when the repo sets no rule but a limit', () => {
    const html = opened(attemptRules({ lines: [] }));
    const words = text(html);

    expect(html).toContain('data-repo-rules="caps"');
    expect(html).toContain('data-repo-caps');
    expect(summaryOf(html)).toBe('Repo rules · 300 lines');
    expect(words).toContain("300 changed lines the repo's, from .github/gitranks.yml");
    expect(html).toContain('href="/contribute/maintainers"');
    expect(html).not.toContain('data-rule=');
    expect(words).not.toContain('This repo sets no rules');
  });

  it('shows the user’s own limits as theirs when the repo’s are higher', () => {
    const words = text(opened(attemptRules({ caps: { lines: 400, files: 15, linesSource: null, filesSource: null } })));

    expect(words).toContain('400 changed lines yours');
    expect(words).not.toContain("the repo's");
  });

  it('leaves out the user’s setting now once the attempt is finished', () => {
    const words = text(opened(attemptRules(), { finished: true }));

    expect(words).toContain("300 changed lines the repo's, from .github/gitranks.yml");
    expect(words).not.toContain('yours is');
  });

  it('shows nothing while the API does not answer the rules', () => {
    const none = (rules: undefined | null, access: Props['access'] = null) =>
      renderToStaticMarkup(
        <AttemptRepoRules rules={rules} access={access} org="driftwood-js" orgAccess={ORG_ACCESS} />,
      );
    expect(none(undefined)).toBe('');
    expect(none(null)).toBe('');
    // Without the rules, nothing at all: the access fact too waits for them.
    expect(none(null, 'replies')).toBe('');
  });

  it('starts closed, a fold of its own, its title in the summary as no heading', () => {
    const html = block();
    const fold = html.match(/<details id="repo-rules"[^>]*>/)?.[0] ?? '';

    expect(fold).toContain('data-repo-rules="listed"');
    expect(fold).not.toContain(' open=""');
    expect(html.match(/<summary[^>]*>(.*?)<\/summary>/)?.[1]).not.toContain('<h2');
    expect(html).toContain('id="repo-rules-title"');
  });

  it('opens from the address and from a move card', () => {
    expect(block()).toContain('data-open-on-hash="repo-rules"');

    const scrollIntoView = vi.fn();
    const fold = { open: false, scrollIntoView };
    expect(openRepoRules({ getElementById: (id: string) => (id === 'repo-rules' ? fold : null) } as never)).toBe(true);
    expect(fold.open).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(openRepoRules({ getElementById: () => null })).toBe(false);
  });

  it('says how GitHub lets GitRanks act here when a refusal proves the organization keeps it out', () => {
    const replies = opened(attemptRules(), { access: 'replies' });
    expect(summaryOf(replies)).toBe('Repo rules · 6 · replies blocked');
    expect(text(replies)).toContain(
      "driftwood-js only lets apps it approved reply in review threads, and GitRanks isn't one yet.",
    );
    expect(replies).toContain('data-repo-access="replies"');
    expect(replies).toContain('data-org-access');

    const submit = opened(attemptRules(), { access: 'submit' });
    expect(summaryOf(submit)).toBe('Repo rules · 6 · access blocked');
    expect(text(submit)).toContain(
      "driftwood-js only lets apps it approved act in its repositories, and GitRanks isn't one yet.",
    );
    expect(submit).toContain('data-repo-access="submit"');
  });

  it('says what GitRanks does where the organization’s refusal of thread replies is kept', () => {
    const kept = opened(attemptRules(), { access: 'replies', threadsBlocked: true });
    expect(summaryOf(kept)).toBe('Repo rules · 6 · replies blocked');
    expect(kept).toMatch(/<summary[^>]*>.*bg-warning-soft[^>]*>replies blocked<\/span>/);
    expect(text(kept)).toContain(
      'driftwood-js blocks review-thread replies: GitRanks tries the first reply in its thread, then posts the rest as one comment.',
    );
    expect(kept).toContain('data-threads-blocked="true"');
    expect(kept).toContain('data-org-access');
    // A refused submit says its own line, the kept refusal or not.
    expect(text(opened(attemptRules(), { access: 'submit', threadsBlocked: true }))).toContain(
      'driftwood-js only lets apps it approved act in its repositories',
    );
    // On the contribution page, the first attempt's read of the kept refusal is enough.
    const page = renderToStaticMarkup(
      <ReviewScreen
        view={views.active}
        attempt={{
          ...followUpAttempts.prNeedsYou,
          repoRules: attemptRules(),
          threadRepliesBlocked: { org: 'driftwood-js', since: NOW.toISOString(), lastRefusedAt: NOW.toISOString() },
        }}
        now={NOW}
      />,
    );
    expect(page).toContain('data-threads-blocked="true"');
  });

  it('sits under the sessions on the contribution page, after the session shown', () => {
    const html = renderToStaticMarkup(
      <ReviewScreen
        view={views.active}
        attempt={{ ...followUpAttempts.prNeedsYou, repoRules: attemptRules() }}
        now={NOW}
      />,
    );
    const panel = html.match(/<section [^>]*aria-labelledby="repo-rules-title"[^>]*>/)?.[0] ?? '';

    expect(html.indexOf('data-shown-session')).toBeGreaterThan(html.indexOf('data-sessions'));
    expect(html.indexOf('data-repo-rules="listed"')).toBeGreaterThan(html.indexOf('data-shown-session'));
    expect(panel).toContain('[grid-area:rules]');
  });

  describe('on the contribution page, from its waiting replies', () => {
    const REFUSED: ContributeSubmitError = {
      reason: 'org_restricted',
      note: 'The organization only lets apps it approved post there.',
      at: '2026-10-28T11:59:00.000Z',
    };
    const first: ContributeAttemptDetail = { ...followUpAttempts.prNeedsYou, repoRules: attemptRules() };
    const page = (replies: Parameters<typeof ReviewScreen>[0]['replies']) =>
      renderToStaticMarkup(<ReviewScreen view={views.active} attempt={first} now={NOW} replies={replies} />);
    const refused = replyWaiting({ state: 'FAILED', lastError: REFUSED });

    it('says the replies are blocked when one of this pull request’s replies was refused for it', () => {
      expect(text(page([refused]))).toContain('Repo rules · 6 · replies blocked');
    });

    it('leaves out another pull request’s replies', () => {
      const html = page([{ ...refused, prId: 'PR_9' }]);
      expect(text(html)).toContain('Repo rules · 6 · 300 lines');
      expect(html).not.toContain('data-repo-access');
    });

    it('counts a reply that is part of a run’s review', () => {
      expect(page([{ ...refused, inReview: true }])).toContain('data-repo-access="replies"');
    });

    it('says the submit is blocked from the first attempt’s submit', () => {
      const bounced = {
        ...attempts.bounced,
        repoRules: attemptRules(),
        submit: { ...attempts.bounced.submit!, lastError: REFUSED },
      };
      const html = renderToStaticMarkup(<ReviewScreen view={views.active} attempt={bounced} now={NOW} />);
      expect(html).toContain('data-repo-access="submit"');
    });
  });
});

describe('the rules on an issue card', () => {
  it('closes them to one line, autopilot first, opening to each rule and its file, never a quote', () => {
    const html = renderToStaticMarkup(<IssueRepoRules rules={issueRules()} />);
    const words = text(html);

    expect(html).toMatch(/^<details data-repo-rules="listed"/);
    expect(words).toContain('This repo’s rules · autopilot off · 5 more');
    expect(words).toContain('No AI-assisted work on good first issues: GitRanks leaves them to newcomers.');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/blob/HEAD/AI_POLICY.md"');
    // The issue card keeps the source's full label; only the contribution's rail uses the compact one.
    expect(words).toContain('AI_POLICY.md ↗');
    expect(html).not.toContain('title="AI_POLICY.md"');
    expect(words).not.toContain('Agents must not');
  });

  it('says a repo has none in one line, and nothing while the API does not answer', () => {
    expect(text(renderToStaticMarkup(<IssueRepoRules rules={{ manualOnly: false, lines: [] }} />))).toContain(
      'This repo sets no rules for AI contributions beyond its CONTRIBUTING.',
    );
    expect(renderToStaticMarkup(<IssueRepoRules rules={undefined} />)).toBe('');
  });

  it('starts closed, and open where the design catalogue draws it so', () => {
    expect(renderToStaticMarkup(<IssueRepoRules rules={issueRules()} />)).not.toContain(' open=""');
    const open = renderToStaticMarkup(
      <RulesOpen.Provider value>
        <IssueRepoRules rules={issueRules()} />
      </RulesOpen.Provider>,
    );
    expect(open).toContain(' open=""');
  });

  it('sits on the card under why it was picked', () => {
    const html = renderToStaticMarkup(<IssueCard issue={issue({ repoRules: issueRules() })} />);

    expect(html.indexOf('data-repo-rules')).toBeGreaterThan(html.indexOf('data-why'));
  });
});

describe('Settings: repos can ask for less', () => {
  it('says so under the caps and autopilot, linking what repos can ask for', () => {
    const html = renderToStaticMarkup(<ReposAskLessNote />);

    expect(text(html)).toContain(
      'Repos can ask for less: their rules lower these caps and can turn autopilot off for their PRs. What repos can ask for',
    );
    expect(html).toContain('href="/contribute/maintainers"');
  });

  it('sits under Budget and the agent in Settings', () => {
    const html = renderToStaticMarkup(<SettingsScreen view={views.active} now={NOW} />);

    expect(html.indexOf('data-repo-rules-note')).toBeGreaterThan(html.indexOf('settings-budget'));
    expect(html.indexOf('data-repo-rules-note')).toBeLessThan(html.indexOf('settings-connections'));
  });
});

describe('"Your repos": what we read and the settings', () => {
  const extras = (
    repo = maintainerRepo({ config: maintainerConfig(), rules: maintainerRules() }),
    facts = allLiveFacts(),
  ) => renderToStaticMarkup(<MaintainerRepoExtras repo={repo} keys={facts.configKeys} />);

  it('lists what we read with the repo’s words, its file, and who set a value here', () => {
    const html = extras();
    const words = text(html);

    expect(words).toContain('What we read from your repo');
    expect(words).toContain('“Write the pull request description yourself, and tell us why the change is needed.”');
    expect(html).toContain('data-rule-source="CONTRIBUTING.md"');
    expect(words).toContain('set by @mira-k');
    expect(words).toContain('.github/gitranks.yml read Nov 3, 2026.');
  });

  it('draws a control for each live key the page sets, never the opt-out', () => {
    const html = extras();
    const keys = [...html.matchAll(/data-config-key="([a-z_]+)"/g)].map(([, key]) => key);

    expect(keys).toEqual([
      'autopilot',
      'beginner_issues',
      'max_open_prs',
      'max_changed_lines',
      'min_account_age_years',
      'min_rank',
      'contact',
    ]);
    expect(text(html)).toContain('Each change saves as you make it');
    expect(html).not.toMatch(/>Save</);
  });

  it('locks a key the file sets, with when it was read, and names who set one here and a value we skipped', () => {
    const html = extras();
    const words = text(html);
    const lines = html.slice(
      html.indexOf('data-config-key="max_changed_lines"'),
      html.indexOf('data-config-key="min_account_age_years"'),
    );

    expect(lines).toContain('disabled=""');
    expect(lines).toContain('value="300"');
    expect(words).toContain('Set in .github/gitranks.yml (read Nov 3, 2026). Change it there.');
    expect(words).toContain('Set by @mira-k on this page.');
    expect(words).toContain('.github/gitranks.yml has “max_open_prs: many”, which it doesn’t take, so we skipped it.');
    expect(html).toContain('value="https://github.com/driftwood-js/driftwood/discussions"');
  });

  it('shows only the live keys: none but the opt-out today', () => {
    const html = extras(undefined, maintainerFacts());

    expect(html).not.toContain('data-config-key');
    expect(text(html)).toContain('What we read from your repo');
  });

  it('says when nothing was read, and shows nothing from an API without the keys', () => {
    expect(text(extras(maintainerRepo({ config: maintainerConfig(), rules: null })))).toContain('Not read yet.');
    expect(
      text(extras(maintainerRepo({ config: maintainerConfig(), rules: { manualOnly: false, lines: [] } }))),
    ).toContain('Nothing yet:');
    expect(extras(maintainerRepo({}))).toBe('');
  });

  it('shows the rules a save answered under "What we read", and locks a key the file turned out to set', () => {
    const repo = maintainerRepo({ config: maintainerConfig(), rules: maintainerRules() });
    const before = { config: repo.config ?? [], rules: repo.rules };
    const answered = maintainerRules({
      lines: [{ ...maintainerRules().lines[5], text: 'At most 5 files per pull request.' }],
    });
    const saved = settingsAfterSave(
      before,
      'max_files',
      { ok: true, data: { repoId: 'R_1', config: before.config, rules: answered } },
      true,
    );
    const words = text(extras(maintainerRepo({ ...saved })));
    expect(words).toContain('At most 5 files per pull request.');
    expect(words).not.toContain('At most 10 files per pull request.');

    const refused = settingsAfterSave(before, 'min_account_age_years', { ok: false, error: 'IN_FILE' }, true);
    const html = extras(maintainerRepo({ ...refused }));
    const age = html.slice(
      html.indexOf('data-config-key="min_account_age_years"'),
      html.indexOf('data-config-key="min_rank"'),
    );
    expect(age).toContain('data-config-source="FILE"');
    expect(age).toContain('disabled=""');
    expect(text(age)).toContain('Set in .github/gitranks.yml (read Nov 3, 2026). Change it there.');
  });

  it('links a choice’s hint to its group of pills', () => {
    const config = maintainerConfig().map((item) =>
      item.key === 'autopilot' ? { ...item, value: 'off', source: 'PAGE' as const, setBy: 'mira-k' } : item,
    );
    const html = extras(maintainerRepo({ config, rules: maintainerRules() }));
    const autopilot = html.slice(
      html.indexOf('data-config-key="autopilot"'),
      html.indexOf('data-config-key="beginner_issues"'),
    );
    const hint = autopilot.match(/<span id="([^"]+-help)"/)?.[1];

    expect(text(autopilot)).toContain('Set by @mira-k on this page.');
    expect(autopilot).toMatch(new RegExp(`<fieldset[^>]*aria-describedby="${hint}"`));
  });

  it('says an opted-out repo’s settings wait until it is back in', () => {
    const repo = maintainerRepo({ optedOut: true, config: maintainerConfig(), rules: maintainerRules() });
    expect(text(extras(repo))).toContain('Opted out: none of these apply until it is back in.');
  });
});
