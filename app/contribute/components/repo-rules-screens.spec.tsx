import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/my/pull-requests/driftwood-js/driftwood/871',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/workspace/start/start-page.actions', () => ({}));
vi.mock('@/lib/contribute/actions', () => ({}));
vi.mock('@/lib/workspace/issue-actions', () => ({}));
// The fold's opener runs in the browser alone: the block says which fold it opens.
vi.mock('@/components/workspace/open-on-hash', () => ({
  OpenOnHash: ({ id }: { id: string }) => <i data-open-on-hash={id} />,
}));
vi.mock('@/app/(public)/contribute/maintainers/actions', () => ({ setMaintainerConfig: vi.fn() }));
vi.mock('@/lib/workspace/contribute.data', () => ({
  loadContribute: vi.fn(),
  loadIssues: vi.fn(),
  loadAttempt: vi.fn(),
}));

const { ReposAskLessNote, RulesOpen } = await import('@/components/workspace/pull-request/repo-rules');
const { IssueRepoRules } = await import('@/components/workspace/pull-request/issue-repo-rules');
const { MaintainerRepoExtras } = await import('./maintainer-repo-extras');
const { IssueRow } = await import('@/components/workspace/issue-row');
const { issueRowOfContribute } = await import('@/lib/workspace/issue-row');
const { AgentScreen } = await import('@/components/workspace/agent/agent-screen');

import { issue } from '@/lib/contribute/__fixtures__/contribute-overview';
import { NOW, views } from '@/lib/contribute/__fixtures__/contribute-views';
import { allLiveFacts, maintainerFacts, maintainerRepo } from '@/lib/contribute/__fixtures__/maintainers';
import { issueRules, maintainerConfig, maintainerRules } from '@/lib/contribute/__fixtures__/repo-rules';
import { settingsAfterSave } from '@/lib/workspace/repo-rules';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replace(/\s+/g, ' ')
    .replaceAll(' :', ':')
    .replaceAll(/ ([.,])(?=\s|$)/g, '$1');

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
    const html = renderToStaticMarkup(
      <IssueRow
        issue={issueRowOfContribute(issue({ repoRules: issueRules() }))}
        side="contribute"
        agents={{ hosted: true, own: false }}
      />,
    );

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

  it("sits under the hosted agent's rows on the Agent tab, above the runs", () => {
    const html = renderToStaticMarkup(<AgentScreen view={views.active} now={NOW} />);

    expect(html.indexOf('data-repo-rules-note')).toBeGreaterThan(html.indexOf('Budget and pacing'));
    expect(html.indexOf('data-repo-rules-note')).toBeLessThan(html.indexOf('id="runs"'));
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
