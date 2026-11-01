import type { ReactNode } from 'react';
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

const { AgentRunsTabLabel, LiveRunPhase, LiveRunsLabel, RightNowLanes, WorkingNowSection } = await import(
  './agent-runs'
);
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

describe('the robot tab', () => {
  it('ends the tabs on every tab, a spinner and the count while agents work, its name in words', () => {
    const html = renderToStaticMarkup(
      <ContributeTabsNav onboarded activity={activityOf(WORKING, FOLLOW_UP, QUEUED, READY)} />,
    );
    expect(html).toContain('href="/contribute/runs"');
    expect(html).toContain('data-agent-runs="working"');
    expect(html).toContain('motion-safe:animate-spin');
    expect(text(html)).toContain('Agent runs: 2 agents working 2');
    expect(html).toContain('title="Agent runs · 2 agents working"');
  });

  it('shows a grey dot and the count with runs live but none working, the robot alone otherwise', () => {
    const queued = renderToStaticMarkup(<AgentRunsTabLabel runs={[QUEUED]} />);
    expect(queued).toContain('data-agent-runs="waiting"');
    expect(text(queued)).toContain('Agent runs: 1 queued 1');
    expect(queued).not.toContain('animate-');
    for (const runs of [[READY], []]) {
      const html = renderToStaticMarkup(<AgentRunsTabLabel runs={runs} />);
      expect(html).toContain('data-agent-runs="none"');
      expect(text(html).trim()).toBe('Agent runs');
    }
    // With no runs it is still there: the history is behind it.
    expect(renderToStaticMarkup(<ContributeTabsNav onboarded activity={activityOf()} />)).toContain(
      'href="/contribute/runs"',
    );
  });
});

describe("Right now's lanes", () => {
  const lanes = (activity: ReturnType<typeof activityOf> | null, props: Record<string, ReactNode> = {}) =>
    renderToStaticMarkup(
      <RightNowLanes activity={activity} hosted={<p>hosted idle</p>} ownAgent={<p>own idle</p>} {...props} />,
    );

  it('lists each lane’s live runs in place of its hold, and what ended under Just finished', () => {
    const own = runOf({ attemptId: 'att_own', runner: 'MCP', spendUsd: null, budgetUsd: null });
    const stopped = runOf({ attemptId: 'att_stopped', phase: 'STOPPED', active: false, label: 'Stopped' });
    const html = lanes(activityOf(WORKING, own, READY, stopped));
    const words = text(html);
    expect(html).toContain('data-now-lanes="working"');
    expect(html).toContain('data-lane="hosted" data-lane-runs="1"');
    expect(html).toContain('data-lane="own" data-lane-runs="1"');
    expect(words).not.toContain('hosted idle');
    expect(words).not.toContain('own idle');
    expect(words).toContain('Step 3 of 5: Working');
    expect(words).toContain('Just finished');
    expect(html).toContain('data-run="att_stopped"');
    // A run ready for review is Needs you's alone.
    expect(html).not.toContain('data-run="att_ready"');
  });

  it('says what holds each lane with no live run, the pause once for both', () => {
    const idle = text(lanes(activityOf(READY)));
    expect(idle).toContain('Hosted agent on your Claude key hosted idle');
    expect(idle).toContain('Your own agent own idle');
    expect(idle).not.toContain('Just finished');
    const paused = text(lanes(null, { paused: <p>both paused</p> }));
    expect(paused.trim()).toBe('both paused');
    // A run started while paused keeps its lane.
    expect(text(lanes(activityOf(WORKING), { paused: <p>both paused</p> }))).not.toContain('both paused');
    // One only queued waits on the pause: the pause stays, the run under it.
    const queuedPaused = lanes(activityOf(QUEUED), { paused: <p>both paused</p> });
    expect(text(queuedPaused)).toContain('both paused');
    expect(queuedPaused).toContain('data-run="att_queued"');
  });

  it('words its heading from the runs its lanes show, never from one left to Needs you', () => {
    expect(text(renderToStaticMarkup(<LiveRunsLabel activity={activityOf(WORKING, READY)} />)).trim()).toBe(
      '1 agent working',
    );
    const autopilot = runOf({ attemptId: 'att_autopilot', phase: 'WAITING_FOR_YOU', active: false });
    expect(renderToStaticMarkup(<LiveRunsLabel activity={activityOf(autopilot)} />)).toBe('');
  });

  it('keeps a lane’s hold in sight while its runs are only queued', () => {
    const html = lanes(activityOf(QUEUED));
    expect(html).toContain('data-now-lanes="idle"');
    expect(text(html)).toContain('hosted idle');
    expect(html).toContain('data-run="att_queued"');
  });
});

describe('a run’s row', () => {
  it('shows repo#issue, title, phase and steps, time, spend, the latest event and the link', () => {
    const html = renderToStaticMarkup(<WorkingNowSection activity={activityOf(WORKING, FOLLOW_UP, QUEUED, READY)} />);
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
  });

  it('shows the user’s own agent with no spend', () => {
    const own = runOf({
      runner: 'MCP',
      spendUsd: null,
      budgetUsd: null,
      label: 'Your agent is working',
      latestEvent: { state: 'RUNNING', detail: 'mcp: claimed', at: '2026-10-31T11:48:00.000Z' },
    });
    const words = text(renderToStaticMarkup(<WorkingNowSection activity={activityOf(own)} />));
    expect(words).toContain('Your agent');
    expect(words).toContain('12 min');
    expect(words).not.toContain('$');
    const quiet = { ...own, active: false, lastCallAt: '2026-10-31T11:46:00.000Z' };
    expect(text(renderToStaticMarkup(<WorkingNowSection activity={activityOf(quiet)} />))).toContain(
      'last call 14 minutes ago',
    );
  });
});

describe('Working now on the runs page', () => {
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
