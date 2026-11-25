import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { SETTINGS_SCREEN } from './settings';
import { FormSettingsScreen } from '@/app/(workspace)/my/agent/components/agent-pages';
import {
  GithubSettingsScreen,
  PullRequestsSettingsScreen,
} from '@/app/(workspace)/my/settings/components/settings-pages';
import { Header } from '@/components/header/header';
import { Button } from '@/components/ui/button';
import { AgentConnectView } from '@/components/workspace/agent/agent-connect';
import { AgentScreen } from '@/components/workspace/agent/agent-screen';
import { RunsScreen } from '@/components/workspace/agent/runs-view';
import {
  AUTOPILOT_CONFIRM_ACTION,
  AUTOPILOT_CONFIRM_LEAD,
  AUTOPILOT_CONFIRM_TITLE,
  AUTOPILOT_HOW_LEAD,
  AUTOPILOT_HOW_TITLE,
  AutopilotConfirmLines,
  AutopilotHowItWorks,
  AutopilotRecord,
} from '@/components/workspace/autopilot';
import { LearnPill } from '@/components/workspace/learn-pill';
import { LimitNotice } from '@/components/workspace/limit-notice';
import { Pagination } from '@/components/workspace/pagination';
import { RefChips } from '@/components/workspace/ref-chips';
import { ShowMore } from '@/components/workspace/show-more';
import { WorkspaceTabsNav } from '@/components/workspace/workspace-tabs-nav';
import { activityOf, WORKING } from '@/lib/contribute/__fixtures__/agent-runs';
import {
  agentTabViews,
  contributor,
  mcpToken,
  NOW,
  settings,
  views,
} from '@/lib/contribute/__fixtures__/contribute-views';
import { learnerPageOf, OWN_LEARN, pageOf, previewPageOf } from '@/lib/contribute/__fixtures__/runs';
import type { ContributeActivity, ContributeView } from '@/lib/workspace/contribute.types';
import { runsQueryOf } from '@/lib/workspace/runs';

/** A made-up token of the real shape, as the connect page shows it once. */
const SHOWN_TOKEN = 'gr_8Kq2vN4tXb7RwL1mZc9HpYe3Ud6SfA0jQg5Ko2Ti8Lm';

/**
 * A dialog drawn open over its page: a portal renders nothing on the server, so the catalogue draws the dialog's own
 * parts (its title, lead and body, exported beside it) in the box the dialog uses (autopilot limits spec §4).
 */
function OpenDialog({ page, title, children }: { page: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="relative">
      {page}
      <div className="absolute inset-0 flex items-start justify-center bg-black/50 px-4 pt-28">
        <div
          role="dialog"
          aria-label={title}
          className="grid w-full max-w-lg gap-4 rounded-lg border bg-background p-6 shadow-lg"
        >
          <h2 className="text-lg font-semibold">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Autopilot open and unlocked, the level below it: what the confirmation shows over. */
const autopilotOff: ContributeView = {
  ...views.autopilotUnlocked,
  contributor: views.autopilotUnlocked.contributor
    ? { ...views.autopilotUnlocked.contributor, settings: { ...settings, hostedLevel: 'NEXT' } }
    : null,
};

/** The Agent tab with the hosted agent at a level: its contributor's settings and autopilot record as given. */
const agentAt = (
  hostedLevel: 'MANUAL' | 'NEXT' | 'AUTOPILOT',
  autopilot: Partial<NonNullable<ContributeView['contributor']>['autopilot']> = {},
  patch: Partial<ContributeView> = {},
): ContributeView => ({
  ...agentTabViews.both,
  contributor: contributor({
    settings: { ...settings, hostedLevel },
    autopilot: { ...contributor().autopilot, available: true, ...autopilot },
  }),
  ...patch,
});

/** Every tab, as an account that has entered sees them. */
const TABS = ['contribute', 'pull-requests', 'agent', 'settings'] as const;

/** The page as the workspace's layout frames it: the site header (it marks itself by the path), then the tabs. */
const frame = (children: ReactNode, activity: ContributeActivity = activityOf(), needsYou: number | null = 2) => (
  <>
    <Header />
    <WorkspaceTabsNav tabs={TABS} activity={activity} needsYou={needsYou} />
    {children}
  </>
);

/** A page's own container, as its `page.tsx` draws it. */
const MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';

const noop = () => {};
export const WORKSPACE_SCREENS: Screen[] = [
  {
    id: 'agent-runs',
    title: 'Agent runs',
    area: 'workspace',
    route: '/my/agent/runs',
    sources: [
      'components/workspace/agent/runs-view.tsx',
      'components/workspace/agent/runs-list.tsx',
      'components/workspace/agent/runs-tiles.tsx',
      'lib/workspace/runs.ts',
    ],
    states: [
      {
        id: 'history',
        title: 'History: a page of 20, the page in the address',
        path: '/my/agent/runs?page=2',
        height: 2000,
        render: () =>
          frame(
            <main className={MAIN}>
              <RunsScreen
                view={views.active}
                page={pageOf({ totals: { ...pageOf().totals, runs: 46 } })}
                query={runsQueryOf({})}
                number={2}
                now={NOW}
              />
            </main>,
          ),
      },
    ],
  },
  {
    id: 'agent-connect',
    title: 'Connect your own agent',
    area: 'workspace',
    route: '/my/agent/connect',
    sources: ['components/workspace/agent/agent-connect.tsx', 'components/workspace/agent/connect-view.tsx'],
    states: [
      {
        id: 'token',
        title: 'The token and its setup: Claude Code',
        path: '/my/agent/connect',
        height: 1500,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pt-9 pb-16">
              <AgentConnectView
                client="claude-code"
                onClient={noop}
                stage="token"
                shown={SHOWN_TOKEN}
                os="mac"
                detectedOs="mac"
                onOs={noop}
                onCreate={noop}
                onAdded={noop}
                onReopen={noop}
                onReplace={noop}
              />
            </main>,
          ),
      },
      {
        id: 'token-antigravity',
        title: "The token in Antigravity's config: one step",
        path: '/my/agent/connect',
        height: 1400,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pt-9 pb-16">
              <AgentConnectView
                client="antigravity"
                onClient={noop}
                stage="token"
                shown={SHOWN_TOKEN}
                os="mac"
                detectedOs="mac"
                onOs={noop}
                onCreate={noop}
                onAdded={noop}
                onReopen={noop}
                onReplace={noop}
              />
            </main>,
          ),
      },
      {
        id: 'proof-prompt',
        title: 'From a proof card: the proof prompt last',
        path: '/my/agent/connect?proof=A_OC',
        height: 1500,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 pt-9 pb-16">
              <AgentConnectView
                client="claude-code"
                onClient={noop}
                stage="added"
                shown={null}
                pending={mcpToken()}
                os="mac"
                detectedOs="mac"
                onOs={noop}
                onCreate={noop}
                onAdded={noop}
                onReopen={noop}
                onReplace={noop}
                proof={{
                  attemptId: 'A_OC',
                  prompt: 'Prove openclaw/openclaw#190186 for GitRanks',
                  prNumber: 190186,
                }}
              />
            </main>,
          ),
      },
    ],
  },
  {
    id: 'workspace-components',
    title: 'Shared parts: references, the limit, pages, show more',
    area: 'workspace',
    route: '/my/pull-requests',
    sources: [
      'components/workspace/ref-chips.tsx',
      'components/workspace/limit-notice.tsx',
      'components/workspace/pagination.tsx',
      'components/workspace/show-more.tsx',
    ],
    states: [
      {
        id: 'all',
        title: 'RefChips, LimitNotice (both wordings), Pagination, ShowMore',
        path: '/my/pull-requests',
        height: 520,
        render: () => (
          <main className={MAIN}>
            <RefChips repo="kelp-db/kelp" issue={1400} pr={{ number: 1419 }}>
              <LearnPill />
            </RefChips>
            <RefChips repo={null} issue={57} />
            <LimitNotice count={8} limit={8} open={8} />
            <LimitNotice count={8} limit={8} open={6} />
            <Pagination page={2} total={46} noun="run" hrefOf={(page) => `/my/agent/runs?page=${page}`} />
            <ShowMore shown={10} total={38} noun="issue" onMore={noop} />
          </main>
        ),
      },
    ],
  },
  {
    id: 'agent',
    title: 'Agent',
    area: 'workspace',
    route: '/my/agent',
    sources: [
      'components/workspace/agent/agent-screen.tsx',
      'components/workspace/agent/own-agent-block.tsx',
      'components/workspace/agent/hosted-agent-block.tsx',
      'components/workspace/agent/hosted-agent-control.tsx',
      'components/workspace/agent/runs-preview.tsx',
      'components/workspace/agent/hosted-level-picker.tsx',
      'components/workspace/agent/agent-first.tsx',
      'components/workspace/autopilot.tsx',
    ],
    states: [
      {
        id: 'nothing-connected',
        title: 'Nothing connected now: the two ways, your own agent recommended',
        path: '/my/agent',
        height: 900,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-16">
              <AgentScreen view={agentTabViews.nothing} runs={pageOf({ items: [] })} now={NOW} />
            </main>,
          ),
      },
      {
        id: 'not-entered',
        title: 'Not entered yet, by its address: no tabs, both ways lead into the flow',
        path: '/my/agent',
        height: 800,
        render: () => (
          <>
            <Header />
            <WorkspaceTabsNav tabs={[]} />
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-16">
              <AgentScreen view={agentTabViews.notEntered} runs={pageOf({ items: [] })} now={NOW} />
            </main>
          </>
        ),
      },
      {
        id: 'summary',
        title: 'Both agents set up',
        path: '/my/agent',
        height: 2300,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-16">
              <AgentScreen view={agentTabViews.both} runs={previewPageOf()} now={NOW} />
            </main>,
          ),
      },
      {
        id: 'autopilot-relocked',
        title: 'Autopilot chosen, then locked again: it works as the level above',
        path: '/my/agent',
        height: 2300,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-16">
              <AgentScreen
                view={agentAt('AUTOPILOT', { mergedCount: 6, mergedToUnlock: 4, lockedAt: '2026-10-20T08:00:00.000Z' })}
                runs={previewPageOf()}
                counts={{ prBound: 1, queued: 0 }}
                now={NOW}
              />
            </main>,
          ),
      },
      {
        id: 'learner',
        title: 'A learner: their own agent, the hosted agent closed to a line',
        path: '/my/agent',
        height: 1300,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-16">
              <AgentScreen
                view={agentTabViews.learner}
                runs={learnerPageOf()}
                activity={activityOf(WORKING)}
                now={NOW}
              />
            </main>,
          ),
      },
      {
        id: 'own-only',
        title: 'Their own agent alone: what the hosted agent is',
        path: '/my/agent',
        height: 1500,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-16">
              <AgentScreen view={agentTabViews.ownOnly} runs={previewPageOf({ items: [OWN_LEARN] })} now={NOW} />
            </main>,
          ),
      },
      {
        id: 'hosted-only',
        title: 'The hosted agent alone: no agent connected',
        path: '/my/agent',
        height: 2100,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-16">
              <AgentScreen view={agentTabViews.hostedOnly} runs={pageOf({ items: [] })} now={NOW} />
            </main>,
          ),
      },
      {
        id: 'key-refused',
        title: 'The key refused: the notice above the hosted agent',
        path: '/my/agent',
        height: 2300,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-16">
              <AgentScreen view={agentTabViews.keyInvalid} runs={undefined} now={NOW} />
            </main>,
          ),
      },
      {
        id: 'phone',
        title: 'Phone',
        path: '/my/agent',
        width: 390,
        height: 3400,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-16">
              <AgentScreen view={agentTabViews.both} runs={previewPageOf()} now={NOW} />
            </main>,
          ),
      },
      {
        id: 'autopilot-how',
        title: 'How autopilot works, at launch',
        path: '/my/agent',
        height: 1800,
        render: () =>
          frame(
            <OpenDialog
              title={AUTOPILOT_HOW_TITLE}
              page={
                <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-16">
                  <AgentScreen view={views.autopilotComing} runs={previewPageOf()} now={NOW} />
                </main>
              }
            >
              <p className="text-sm text-muted-foreground">{AUTOPILOT_HOW_LEAD}</p>
              <AutopilotHowItWorks
                autopilot={views.autopilotComing.contributor.autopilot}
                login={views.autopilotComing.contributor.login}
              />
              <div className="border-t pt-3">
                <AutopilotRecord autopilot={views.autopilotComing.contributor.autopilot} />
              </div>
            </OpenDialog>,
          ),
      },
      {
        id: 'autopilot-confirm',
        title: 'Turning autopilot on: confirm first',
        path: '/my/agent',
        height: 1800,
        render: () =>
          frame(
            <OpenDialog
              title={AUTOPILOT_CONFIRM_TITLE}
              page={
                <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-16">
                  <AgentScreen view={autopilotOff} runs={previewPageOf()} now={NOW} />
                </main>
              }
            >
              <p className="text-sm text-muted-foreground">{AUTOPILOT_CONFIRM_LEAD}</p>
              <AutopilotConfirmLines />
              <span className="text-sm font-semibold text-link">{AUTOPILOT_HOW_TITLE}</span>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
                <Button type="button">{AUTOPILOT_CONFIRM_ACTION}</Button>
              </div>
            </OpenDialog>,
          ),
      },
    ],
  },
  SETTINGS_SCREEN,
  {
    id: 'settings-pull-requests',
    title: 'Pull requests',
    area: 'workspace',
    route: '/my/settings/pull-requests',
    sources: [
      'app/(workspace)/my/settings/components/settings-pages.tsx',
      'components/workspace/settings/settings-form.tsx',
    ],
    states: [
      {
        id: 'form',
        title: 'The limits for both agents: size, open, attempts, sign-off',
        path: '/my/settings/pull-requests',
        height: 1250,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
              <PullRequestsSettingsScreen view={views.active} />
            </main>,
          ),
      },
    ],
  },
  {
    id: 'settings-github',
    title: 'GitHub access',
    area: 'workspace',
    route: '/my/settings/github',
    sources: [
      'app/(workspace)/my/settings/components/settings-pages.tsx',
      'components/workspace/agent/access-section.tsx',
    ],
    states: [
      {
        id: 'refused',
        title: 'GitHub sent back another account',
        path: '/my/settings/github?grant=refused',
        height: 700,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
              <GithubSettingsScreen view={views.grantMissing} grantRefusal="refused" />
            </main>,
          ),
      },
    ],
  },
  {
    id: 'agent-model',
    title: 'Model and effort',
    area: 'workspace',
    route: '/my/agent/model',
    sources: ['app/(workspace)/my/agent/components/agent-pages.tsx', 'components/workspace/settings/settings-form.tsx'],
    states: [
      {
        id: 'form',
        title: 'The hosted agent’s models and effort',
        path: '/my/agent/model',
        height: 900,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
              <FormSettingsScreen page="model" view={views.active} />
            </main>,
          ),
      },
      {
        id: 'budget',
        title: 'Budget and pacing, attempts at a time in Settings',
        path: '/my/agent/budget#more-limits',
        height: 1200,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
              <FormSettingsScreen page="budget" view={views.active} />
            </main>,
          ),
      },
    ],
  },
];
