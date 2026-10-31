import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute/issues',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app/contribute/actions', () => ({ readContributeChanges: vi.fn() }));
vi.mock('@/components/navigation-progress/navigation-progress', () => ({ useReportPendingNavigation: () => {} }));
vi.mock('@/lib/contribute/contribute.data', () => ({}));

const { AgentRunsIndicatorView, AgentRunsSheet, LiveRunPhase, WorkingNowSection } = await import('./agent-runs');
const { ContributeTabsNav } = await import('./contribute-tabs-nav');
const { ContributionsScreen } = await import('./contributions-view');
const { activityOf, FOLLOW_UP, QUEUED, READY, runOf, WORKING } = await import(
  '@/lib/contribute/__fixtures__/agent-runs'
);
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { attempt, contributions } = await import('@/lib/contribute/__fixtures__/contribute-attempts');
const { publishContributeActivity } = await import('@/lib/contribute/changes-bus');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

describe('the agent runs in the header', () => {
  it('shows on every tab while runs are listed, with a dot that breathes only while an agent works', () => {
    const html = renderToStaticMarkup(
      <ContributeTabsNav onboarded activity={activityOf(WORKING, FOLLOW_UP, QUEUED, READY)} />,
    );
    expect(html).toContain('data-agent-runs="working"');
    expect(text(html)).toContain('2 agents working');
    expect(html).toContain('motion-safe:animate-contribute-pulse');
    // A settled-only list says how it ended, with no live animation.
    const settled = renderToStaticMarkup(<AgentRunsIndicatorView activity={activityOf(READY)} />);
    expect(settled).toContain('data-agent-runs="settled"');
    expect(text(settled)).toContain('Ready for you');
    expect(settled).not.toContain('animate-');
  });

  it('is not there with no runs', () => {
    const html = renderToStaticMarkup(<ContributeTabsNav onboarded activity={activityOf()} />);
    expect(html).not.toContain('data-agent-runs');
  });

  it('opens on each run: repo#issue, title, phase and steps, time, spend, the latest event and the link', () => {
    const html = renderToStaticMarkup(<AgentRunsSheet activity={activityOf(WORKING, FOLLOW_UP, QUEUED, READY)} />);
    const words = text(html);
    expect(words).toContain('acme/widgets#42');
    expect(words).toContain('Crash on empty input');
    expect(words).toContain('Working on a fix');
    expect(words).toContain('Step 3 of 5: Working');
    expect(words).toContain('12 min · $0.42 of $2');
    expect(words).toContain('go: budget raised to $1.80, the work sent');
    expect(html).toContain('href="/contribute/attempts/att_working"');
    expect(words).toContain('Follow-up');
    expect(words).toContain('Addressing review');
    expect(words).toContain('Queued, 1st in line');
    // A settled run: how it ended, and the way to it.
    expect(html).toContain('data-phase="READY"');
    expect(words).toContain('Ready for you');
    expect(words).toContain('Review →');
    expect(words).toContain('My contributions →');
  });

  it('shows the user’s own agent with no spend', () => {
    const own = runOf({
      runner: 'MCP',
      spendUsd: null,
      budgetUsd: null,
      label: 'Your agent is working',
      latestEvent: { state: 'RUNNING', detail: 'mcp: claimed', at: '2026-10-31T11:48:00.000Z' },
    });
    const words = text(renderToStaticMarkup(<AgentRunsSheet activity={activityOf(own)} />));
    expect(words).toContain('Your agent');
    expect(words).toContain('12 min');
    expect(words).not.toContain('$');
    const quiet = { ...own, active: false, lastCallAt: '2026-10-31T11:46:00.000Z' };
    expect(text(renderToStaticMarkup(<AgentRunsSheet activity={activityOf(quiet)} />))).toContain(
      'last call 14 minutes ago',
    );
  });
});

describe('Working now on Overview', () => {
  it('lists the runs, and nothing with none', () => {
    const html = renderToStaticMarkup(<WorkingNowSection activity={activityOf(WORKING, READY)} />);
    expect(html).toContain('data-overview-section="working"');
    expect(text(html)).toContain('Working now 1 agent working');
    expect(html).toContain('data-run="att_ready"');
    expect(renderToStaticMarkup(<WorkingNowSection activity={activityOf()} />)).toBe('');
    expect(renderToStaticMarkup(<WorkingNowSection activity={null} />)).toBe('');
  });
});

describe('My contributions’ rows in progress', () => {
  it('show the live phase of their run, the row’s own line without one', () => {
    const html = renderToStaticMarkup(
      <ContributionsScreen
        view={views.active}
        contributions={contributions}
        attempts={[
          attempt({ attemptId: 'att_working', state: 'RUNNING' }),
          attempt({ attemptId: 'att_other', state: 'CHECKS' }),
        ]}
        activity={activityOf(WORKING)}
      />,
    );
    expect(html).toContain('data-live-phase="WORKING"');
    expect(text(html)).toContain('Working on a fix');
    expect(html.match(/data-live-phase/g)).toHaveLength(1);
  });

  it('follows the poll’s newer read', () => {
    const later = {
      ...activityOf(runOf({ phase: 'RUNNING_CHECKS', label: 'Running checks' })),
      readAt: '2026-10-31T12:00:10.000Z',
    };
    publishContributeActivity(later);
    const html = renderToStaticMarkup(
      <LiveRunPhase attemptId="att_working" activity={activityOf(WORKING)}>
        own line
      </LiveRunPhase>,
    );
    // The server snapshot is the page's: the bus only counts once hydrated.
    expect(html).toContain('data-live-phase="WORKING"');
    publishContributeActivity(null);
  });
});
