import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/learn/issues.actions', () => ({ setLearnIssuesEmailAction: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/my/agent',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/contribute/actions', () => ({}));
vi.mock('@/lib/workspace/gate.data', () => ({}));
vi.mock('@/lib/workspace/issue-actions', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => ({
  loadContribute: vi.fn(),
  loadAttempt: vi.fn(),
  loadIssues: vi.fn(),
}));
vi.mock('@/lib/contribute/contribute.data', () => ({ loadIssues: vi.fn() }));
vi.mock('@/lib/learn/actions', () => ({}));
vi.mock('@/lib/learn/settings.data', () => ({}));
vi.mock('@/lib/skills/skills.data', () => ({}));
vi.mock('@/lib/learn/settings.actions', () => ({}));
vi.mock('@/lib/learn/learn.data', () => ({}));

const { RunsTiles } = await import('./runs-tiles');
const { AgentFirst } = await import('./agent-first');
const { OwnAgentConnectScreen } = await import('./connect-view');
const { FormSettingsScreen, KeyScreen } = await import('@/app/(workspace)/my/agent/components/agent-pages');
const { moreLimitsSummaryOf } = await import('@/components/workspace/settings/settings-form');
const { budgetSummaryOf } = await import('@/lib/workspace/settings-summary');
const { daySumLabel, percentLabel, runReasonOf } = await import('@/lib/workspace/runs');
const { usd } = await import('@/lib/workspace/format');
const { contributor, settings, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { agentTabViews } = await import('@/lib/contribute/__fixtures__/contribute-views');

import type { ContributeRun, ContributeRunsTotals } from '@/lib/workspace/runs';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

const NO_TOTALS: ContributeRunsTotals = {
  runs: 0,
  started: 0,
  costUsd: 0,
  prs: 0,
  merged: 0,
  closed: 0,
  noGo: 0,
  noGoCostUsd: 0,
  noGoByCategory: [],
  lessons: 0,
  lessonsPassed: 0,
};

/** A number standing alone as a count of nothing: "0 merged", "$0", "of 0". */
const ZERO = /(^|[^\d.,$])\$?0(?![\d.,%])/;

describe('the run tiles say nothing in words, never as a zero or a dash', () => {
  it('with no runs at all', () => {
    for (const variant of ['preview', 'history'] as const) {
      for (const learner of [false, true]) {
        const plain = text(renderToStaticMarkup(<RunsTiles totals={NO_TOTALS} variant={variant} learner={learner} />));
        expect(plain).not.toMatch(ZERO);
        expect(plain).not.toContain('—');
      }
    }
    const plain = text(renderToStaticMarkup(<RunsTiles totals={NO_TOTALS} variant="history" />));
    expect(plain).toContain('Runs No runs yet');
    expect(plain).toContain('Spent Nothing spent yet');
    expect(plain).toContain('Pull requests None opened yet');
    expect(plain).toContain('Merge rate None decided yet');
    expect(plain).toContain('No-go rate None started yet');
  });

  it('leaves out the counts that are zero beside the ones that are not', () => {
    const totals = { ...NO_TOTALS, runs: 4, started: 4, costUsd: 1.2, prs: 2, merged: 2, lessons: 1 };
    const preview = text(renderToStaticMarkup(<RunsTiles totals={totals} variant="preview" />));
    expect(preview).toContain('Pull requests 2 2 merged');
    expect(preview).toContain('No-go rate 0% None of 4 started');
    const history = text(renderToStaticMarkup(<RunsTiles totals={totals} variant="history" />));
    expect(history).toContain('Pull requests 2 2 merged');
    expect(history).toContain('Merge rate 100% of 2 decided');
    expect(history).not.toMatch(/started · \$0/);
    const learner = text(renderToStaticMarkup(<RunsTiles totals={totals} variant="history" learner />));
    expect(learner).toContain('Lessons written 1 None passed by you yet');
  });

  it('gives a rate with nothing to divide by no value, and a day row no $0', () => {
    expect(percentLabel(1, 0)).toBe('');
    expect(daySumLabel({ day: '2026-10-31', runs: 3, costUsd: 0, prs: 0 }, usd)).toBe('3 runs');
    expect(daySumLabel({ day: '2026-10-31', runs: 1, costUsd: 0.5, prs: 1 }, usd)).toBe('1 run · $0.50 · 1 PR');
  });
});

describe("a run's reason", () => {
  it('says someone took the issue, never "claimed"', () => {
    const run = { outcome: 'STOPPED', reason: 'claimed_in_comments' } as unknown as ContributeRun;
    expect(runReasonOf(run)).not.toMatch(/claim/i);
  });
});

describe('the budget lines', () => {
  it('says nothing spent in words, and calls the per-run cap a run, as its field is', () => {
    const spend = { ...contributor().spend!, cycleUsd: 0 };
    expect(budgetSummaryOf(settings, spend)).toBe('Nothing spent of $200 this cycle · renews Nov 14 · up to $5 a run');
  });

  it('leaves the sweep out of the fold\'s line while its field is empty, never "?"', () => {
    const draft = {
      weekCapUsd: '',
      dayCapUsd: '$15',
      attemptCapUsd: '$5',
      sweepDays: ' ',
      renewalDay: 14,
    } as unknown as Parameters<typeof moreLimitsSummaryOf>[0];
    expect(moreLimitsSummaryOf(draft)).toBe('no week cap · $15 a day · $5 a run · renews on the 14th');
  });
});

describe('the Agent tab with nothing connected', () => {
  it('gives the two ways the same parts: a pill row, the facts, a link to read more, one button', () => {
    const html = renderToStaticMarkup(<AgentFirst entered />);
    const cards = html
      .split('data-agent-way=')
      .slice(1)
      .map((card) => card.slice(0, card.indexOf('</section>')));
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card).toContain('min-h-6');
      expect(card.match(/<dt/g)).toHaveLength(4);
      expect(card.match(/<a /g)).toHaveLength(2);
    }
    expect(text(html)).toContain('What a run costs: the FAQ →');
    expect(html).toContain('href="/contribute/faq#cost-per-pr"');
  });
});

describe("the Agent tab's pages", () => {
  it('offers VS Code among the agents to connect, as the start flow does', () => {
    const html = renderToStaticMarkup(<OwnAgentConnectScreen view={agentTabViews.ownOnly} />);
    expect(text(html)).toContain('VS Code');
    expect(text(html)).not.toContain('VS Code or another agent?');
  });

  it('titles the model page before a key by the model, not by spending limits', () => {
    const model = text(renderToStaticMarkup(<FormSettingsScreen page="model" view={agentTabViews.ownOnly} />));
    expect(model).toContain('The model and its effort');
    expect(model).not.toContain('Spending limits');
    const budget = text(renderToStaticMarkup(<FormSettingsScreen page="budget" view={agentTabViews.ownOnly} />));
    expect(budget).toContain('Spending limits and pacing');
  });

  it('gives the key page without a key the way back to the Agent tab, and no first-time words', () => {
    const html = renderToStaticMarkup(<KeyScreen view={agentTabViews.ownOnly} today={14} />);
    expect(html).toMatch(/href="\/my\/agent"[^>]*>.*Agent<\/a>/);
    expect(text(html)).not.toContain('The only step');
    expect(text(html)).not.toContain('first issues right after this');
    expect(views.active).toBeTruthy();
  });
});
