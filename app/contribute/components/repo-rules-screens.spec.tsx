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
vi.mock('@/app/contribute/maintainers/actions', () => ({ setMaintainerConfig: vi.fn() }));
vi.mock('@/lib/contribute/contribute.data', () => ({
  loadContribute: vi.fn(),
  loadIssues: vi.fn(),
  loadAttempt: vi.fn(),
  loadResolveHumanThreads: vi.fn(async () => undefined),
}));

const { AttemptRepoRules, ReposAskLessNote } = await import('./repo-rules');
const { IssueRepoRules, IssueRulesOpen } = await import('./issue-repo-rules');
const { MaintainerRepoExtras } = await import('./maintainer-repo-extras');
const { ReviewScreen } = await import('./review-view');
const { IssueCard } = await import('./issue-card');
const { SettingsScreen } = await import('./settings-view');

import { decisionAttempts } from '@/lib/contribute/__fixtures__/contribute-attempts';
import { issue } from '@/lib/contribute/__fixtures__/contribute-overview';
import { NOW, settings, views } from '@/lib/contribute/__fixtures__/contribute-views';
import { allLiveFacts, maintainerFacts, maintainerRepo } from '@/lib/contribute/__fixtures__/maintainers';
import {
  attemptNoRules,
  attemptRules,
  issueRules,
  maintainerConfig,
  maintainerRules,
} from '@/lib/contribute/__fixtures__/repo-rules';
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
  const block = (rules = attemptRules()) =>
    renderToStaticMarkup(<AttemptRepoRules rules={rules} settings={settings} />);

  it('lists each rule in a line with its file, the limits the repo set beside the user’s, and what repos can ask', () => {
    const html = block();
    const words = text(html);

    expect(html).toContain('data-repo-rules="listed"');
    expect(words).toContain('This repo’s rules 6');
    expect(words).toContain("The pull request's description says why in the contributor's own words.");
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/blob/HEAD/CONTRIBUTING.md"');
    expect(words).toContain('Changed lines: 300 (repo) · your setting now 400');
    expect(words).toContain('Files: 10 (repo) · your setting now 15');
    expect(words).toContain("a maintainer's setting on gitranks.com");
    expect(html).toContain('href="/contribute/maintainers"');
  });

  it('keeps the repo’s words closed under the source, opened by a tap, and never says who set a value', () => {
    const html = block();
    const quotes = [...html.matchAll(/<details data-rule-quote=""[^>]*>(.*?)<\/details>/g)].map(([whole]) => whole);

    // A <details>, not a tooltip: a tap or the keyboard opens it.
    expect(quotes).toHaveLength(4);
    expect(quotes.every((quote) => !quote.includes(' open=""'))).toBe(true);
    expect(text(quotes[0])).toContain(
      'Their words “Agents must not open pull requests on their own. A person reviews and submits every change.”',
    );
    expect(html).toContain('data-rule-source="AI_POLICY.md"');
    expect(html).toContain('data-rule-source="GitRanks maintainers page"');
    expect(html).not.toContain('mira-k');
  });

  it('says a repo with no rules sets none, with the user’s own limits', () => {
    const words = text(block(attemptNoRules()));

    expect(words).toContain(
      'This repo sets no rules for AI contributions beyond its CONTRIBUTING. Every PR waits for your review.',
    );
    expect(words).toContain('Your limits apply: 400 changed lines, 15 files.');
  });

  it('shows the user’s own limits as theirs when the repo’s are higher', () => {
    const words = text(block(attemptRules({ caps: { lines: 400, files: 15, linesSource: null, filesSource: null } })));

    expect(words).toContain('Changed lines: 400 (yours)');
    expect(words).not.toContain('(repo)');
  });

  it('leaves out the user’s setting now once the attempt is finished', () => {
    const words = text(renderToStaticMarkup(<AttemptRepoRules rules={attemptRules()} settings={settings} finished />));

    expect(words).toContain('Changed lines: 300 (repo)');
    expect(words).not.toContain('your setting now');
  });

  it('shows nothing while the API does not answer the rules', () => {
    expect(renderToStaticMarkup(<AttemptRepoRules rules={undefined} />)).toBe('');
    expect(renderToStaticMarkup(<AttemptRepoRules rules={null} />)).toBe('');
  });

  it('sits under the sessions on the contribution page', () => {
    const html = renderToStaticMarkup(
      <ReviewScreen view={views.active} attempt={{ ...decisionAttempts.went, repoRules: attemptRules() }} now={NOW} />,
    );

    expect(html.indexOf('data-repo-rules="listed"')).toBeGreaterThan(html.indexOf('data-sessions'));
    expect(html.indexOf('data-repo-rules="listed"')).toBeLessThan(html.indexOf('data-shown-session'));
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
      <IssueRulesOpen.Provider value>
        <IssueRepoRules rules={issueRules()} />
      </IssueRulesOpen.Provider>,
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
