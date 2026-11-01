import { describe, expect, it } from 'vitest';

import { runOf as run } from './__fixtures__/runs';
import { usd } from './format';
import {
  dayRowLabel,
  daySumLabel,
  durationLabel,
  isFiltered,
  NO_GO_CATEGORIES,
  runDaysOf,
  runnerLabelOf,
  runReasonOf,
  runsFilterOf,
  runsHref,
  runsQueryOf,
} from './runs';

const NOW = new Date('2026-10-31T23:20:00.000Z');

describe('the URL keeps the filters (runsQueryOf, runsHref)', () => {
  it('reads them back as it wrote them, the default dates left out', () => {
    const query = runsQueryOf({
      outcome: 'no_go',
      reason: 'needs_design',
      repo: 'can1357/oh-my-pi',
      runner: 'own',
      range: '7d',
    });
    expect(query).toEqual({
      outcome: 'NO_GO',
      reason: 'NEEDS_DESIGN',
      repo: 'can1357/oh-my-pi',
      runner: 'MCP',
      range: '7d',
    });
    expect(runsHref(query)).toBe(
      '/contribute/runs?outcome=no_go&reason=needs_design&repo=can1357%2Foh-my-pi&runner=own&range=7d',
    );
    expect(runsQueryOf(Object.fromEntries(new URLSearchParams(runsHref(query).split('?')[1])))).toEqual(query);
    expect(runsHref(runsQueryOf({}))).toBe('/contribute/runs');
  });

  it('drops what it does not know', () => {
    expect(
      runsQueryOf({ outcome: 'won', reason: 'x', repo: '../etc', runner: 'robot', range: '1y', after: 'abc' }),
    ).toEqual({
      range: '30d',
    });
    expect(isFiltered(runsQueryOf({}))).toBe(false);
    expect(isFiltered(runsQueryOf({ range: 'all' }))).toBe(true);
  });
});

describe("the API's filter (runsFilterOf)", () => {
  it('counts the range back from the start of the UTC day, and a category wins over the outcome', () => {
    expect(runsFilterOf(runsQueryOf({ range: '7d', outcome: 'pr' }), NOW)).toEqual({
      outcome: 'PR',
      from: '2026-10-25T00:00:00.000Z',
    });
    expect(
      runsFilterOf(runsQueryOf({ range: 'all', outcome: 'pr', reason: 'already_fixed', runner: 'hosted' }), NOW),
    ).toEqual({
      category: 'ALREADY_FIXED',
      runner: 'MANAGED_AGENTS',
    });
  });
});

describe('a run in words', () => {
  it('says the runner, its time and why it ended', () => {
    expect(runnerLabelOf(run({}))).toBe('Hosted · Sonnet 5.5');
    expect(runnerLabelOf(run({ runner: 'MCP', agent: { name: 'CLAUDE_CODE', model: 'opus' } }))).toBe('Claude Code');
    expect(durationLabel('2026-10-31T21:05:00.710Z', '2026-10-31T21:08:05.623Z')).toBe('3m 05s');
    expect(durationLabel('2026-10-31T21:05:00Z', '2026-10-31T21:05:32Z')).toBe('32s');
    expect(durationLabel('2026-10-31T21:05:00Z', null)).toBe('');
    expect(runReasonOf(run({}))).toBe('PR #47605 · waiting on maintainers');
    expect(
      runReasonOf(
        run({
          outcome: 'NO_GO',
          endReason: 'NO_GO',
          endDetail: 'Needs a design decision. The issue is still current on main (62f4f7cc): the body caps at 8 rows.',
        }),
      ),
    ).toBe('Needs a design decision.');
    expect(runReasonOf(run({ outcome: 'CHECKS_FAILED', endDetail: 'tests_passed' }))).toBe('The tests did not pass');
    expect(runReasonOf(run({ outcome: 'NOT_STARTED', endDetail: 'ref_pr' }))).toBe('Another PR already references it');
    expect(runReasonOf(run({ outcome: 'NOT_STARTED', endDetail: 'brand_new' }))).toBe('brand new');
    expect(runReasonOf(run({ outcome: 'STOPPED', endReason: 'BUDGET' }))).toMatch(/limit for one attempt/);
  });

  it("a no-go at the check limit: the agent's reason with the note, or what it was on when it ran out", () => {
    const decided = run({
      outcome: 'NO_GO',
      endReason: 'NO_GO',
      noGoCategory: 'CANNOT_REPRODUCE',
      endDetail: "The renderer needs a GPU. A person with one would have to try. Decided at the check's budget limit.",
    });
    expect(runReasonOf(decided)).toBe("The renderer needs a GPU. · decided at the check's limit");
    const ranOut = run({
      outcome: 'NO_GO',
      endReason: 'NO_GO',
      noGoCategory: 'OUT_OF_BUDGET',
      endDetail: 'No verdict: it was on "bash: npm ci" when the check\'s $0.50 budget ran out, after 19 min.',
    });
    expect(runReasonOf(ranOut)).toBe(
      'No verdict: it was on "bash: npm ci" when the check\'s $0.50 budget ran out, after 19 min.',
    );
    expect(NO_GO_CATEGORIES.OUT_OF_BUDGET.label).toBe('Ran out of budget');
  });
});

describe('the runs by day (runDaysOf)', () => {
  it('folds back-to-back runs that never started on one issue, and keeps days apart', () => {
    const retry = (minute: number) =>
      run({
        outcome: 'NOT_STARTED',
        number: 8040,
        nameWithOwner: 'recharts/recharts',
        createdAt: `2026-10-31T20:${minute}:00.000Z`,
      });
    const days = runDaysOf([
      run({ attemptId: 'a1', createdAt: '2026-10-31T21:05:00.000Z' }),
      retry(20),
      retry(15),
      retry(10),
      run({ outcome: 'NOT_STARTED', number: 1, createdAt: '2026-10-31T20:05:00.000Z' }),
      run({ outcome: 'MERGED', createdAt: '2026-10-30T23:15:00.000Z' }),
    ]);
    expect(
      days.map(({ day, lines }) => [day, lines.map((line) => (line.kind === 'folded' ? line.runs.length : 'run'))]),
    ).toEqual([
      ['2026-10-31', ['run', 3, 1]],
      ['2026-10-30', ['run']],
    ]);
  });

  it('labels a day row with the whole day’s sums', () => {
    expect(dayRowLabel('2026-10-31', NOW)).toBe('Today · Sat, Oct 31');
    expect(dayRowLabel('2026-10-30', NOW)).toBe('Yesterday · Fri, Oct 30');
    expect(dayRowLabel('2026-10-12', NOW)).toBe('Mon, Oct 12');
    expect(daySumLabel({ day: '2026-10-31', runs: 25, costUsd: 2.28, prs: 4 }, usd)).toBe('25 runs · $2.28 · 4 PRs');
    expect(daySumLabel({ day: '2026-10-30', runs: 1, costUsd: 0.07, prs: 0 }, usd)).toBe('1 run · $0.07');
  });
});
