import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { AgentConnectView } from '@/app/contribute/components/agent-connect';
import {
  AUTOPILOT_CONFIRM_ACTION,
  AUTOPILOT_CONFIRM_LEAD,
  AUTOPILOT_CONFIRM_TITLE,
  AUTOPILOT_HOW_LEAD,
  AUTOPILOT_HOW_TITLE,
  AutopilotConfirmLines,
  AutopilotHowItWorks,
  AutopilotRecord,
} from '@/app/contribute/components/autopilot-section';
import { ContributeTabsNav, HeaderLine } from '@/app/contribute/components/contribute-tabs-nav';
import { ContributionsScreen } from '@/app/contribute/components/contributions-view';
import { IssuesScreen } from '@/app/contribute/components/issues-view';
import { Landing } from '@/app/contribute/components/landing';
import { LedgerScreen } from '@/app/contribute/components/ledger-view';
import { MaintainerReposPanel, MaintainersScreen } from '@/app/contribute/components/maintainers-view';
import { OverviewScreen, overviewSectionsOf } from '@/app/contribute/components/overview-status';
import { ReviewScreen } from '@/app/contribute/components/review-view';
import { RunsScreen } from '@/app/contribute/components/runs-view';
import { SettingsScreen } from '@/app/contribute/components/settings-view';
import { Header } from '@/components/header/header';
import { Button } from '@/components/ui/button';
import { activityOf, FOLLOW_UP, runOf, WORKING } from '@/lib/contribute/__fixtures__/agent-runs';
import {
  attempt,
  contributions,
  decisionAttempts,
  detail,
  followUpAttempts,
} from '@/lib/contribute/__fixtures__/contribute-attempts';
import { issuePage, nowIdle, overviewData } from '@/lib/contribute/__fixtures__/contribute-overview';
import { contributor, mcpToken, NOW, settings, views } from '@/lib/contribute/__fixtures__/contribute-views';
import { emptyLedger, ledger, publicLedger } from '@/lib/contribute/__fixtures__/ledger';
import { maintainerRepo } from '@/lib/contribute/__fixtures__/maintainers';
import {
  needsSome,
  nextForAgreement,
  nextForDco,
  nextForProof,
  nextForRun,
  nextForYou,
} from '@/lib/contribute/__fixtures__/needs-you';
import { pageOf } from '@/lib/contribute/__fixtures__/runs';
import type { ContributeActivity, ContributeAttemptDetail, ContributeView } from '@/lib/contribute/contribute.types';
import type { MaintainerReposView } from '@/lib/contribute/maintainers.data';
import type { NeedsYouRead } from '@/lib/contribute/needs-you';
import { runsQueryOf } from '@/lib/contribute/runs';

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

/** A change autopilot would have submitted: every check and test passed, the risk low. */
const held = detail({
  ...decisionAttempts.went,
  result: decisionAttempts.went.result
    ? {
        ...decisionAttempts.went.result,
        tests: decisionAttempts.went.result.tests.map((test) => ({ ...test, passed: true })),
      }
    : null,
});

/** Autopilot open and unlocked, the setting off: what the confirmation shows over. */
const autopilotOff: ContributeView = {
  ...views.autopilotUnlocked,
  contributor: views.autopilotUnlocked.contributor
    ? { ...views.autopilotUnlocked.contributor, settings: { ...settings, autopilot: false } }
    : null,
};

/** A key and a live token the agent has called with: both lanes of Right now. */
const both: ContributeView = {
  ...views.active,
  contributor: contributor({ settings: { ...settings, attemptsAtATime: 2 } }),
  ownAgent: { paths: { hosted: true, mcp: true }, tokens: [mcpToken({ lastUsedAt: '2026-10-28T09:00:00.000Z' })] },
};

const own = runOf({
  attemptId: 'att_own',
  runner: 'MCP',
  spendUsd: null,
  budgetUsd: null,
  nameWithOwner: 'quill-rs/quill',
  number: 1204,
  title: 'Panic when the config file is empty',
  label: 'Your agent is working',
});
const stopped = runOf({
  attemptId: 'att_stopped',
  phase: 'STOPPED',
  active: false,
  label: 'Stopped',
  nameWithOwner: 'iptv-org/iptv',
  number: 57201,
  title: 'Add: Mi Musica Hits SD',
  latestEvent: { state: 'STOPPED', detail: 'No-go: nothing here needs a code change.', at: '2026-10-31T11:58:00.000Z' },
});

/** The page as the Contribute layout frames it: the site header, then the tabs. */
const frame = (children: ReactNode, activity: ContributeActivity = activityOf()) => (
  <>
    <Header section="contribute" />
    <ContributeTabsNav onboarded activity={activity} />
    {children}
  </>
);

/** A page's own container, as its `page.tsx` draws it. */
const MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';

const overview = (
  view: ContributeView,
  activity: ContributeActivity,
  working: boolean,
  needs: NeedsYouRead = overviewData().needs,
) =>
  frame(
    <OverviewScreen
      view={view}
      now={NOW}
      sections={overviewSectionsOf(
        view,
        {
          ...overviewData(),
          needs,
          activity,
          now: working
            ? {
                ...nowIdle,
                inFlight: [
                  attempt({ state: 'RUNNING', runner: 'MANAGED_AGENTS' }),
                  attempt({
                    attemptId: 'A_own',
                    state: 'RUNNING',
                    runner: 'MCP',
                    agent: { name: 'CLAUDE_CODE', model: null },
                  }),
                ],
              }
            : nowIdle,
        },
        NOW,
      )}
    />,
    activity,
  );

const busy = activityOf(WORKING, FOLLOW_UP, own, stopped);

/** A contribution's page: its first attempt, on the next step or its own session. */
const attemptPage = (first: ContributeAttemptDetail, next: boolean, view: ContributeView = views.active) =>
  frame(
    <main className={MAIN}>
      <ReviewScreen view={view} attempt={first} next={next} now={NOW} />
    </main>,
  );

/** The user's own agent has called GitRanks: a proof's card asks only for the prompt. */
const agentConnected: ContributeView = {
  ...views.active,
  ownAgent: {
    paths: { hosted: true, mcp: true },
    tokens: [mcpToken({ lastUsedAt: '2026-10-28T10:00:00.000Z' })],
  },
};

const noop = () => {};

/** My contributions with every reason a pull request needs the user, and the runs at work. */
const mine = () => {
  const { reviews, replies, contributions: prs, runs } = needsSome();
  return frame(
    <main className={MAIN}>
      <ContributionsScreen
        view={views.active}
        contributions={{ ...contributions, items: [...(prs ?? []), contributions.items[0]] }}
        attempts={[...(reviews ?? []), ...(runs ?? []), attempt({ attemptId: 'A_2', state: 'RUNNING', costUsd: 0.4 })]}
        replies={replies}
        now={NOW}
      />
    </main>,
    busy,
  );
};

/** The page for maintainers: open to everyone, the site header with no tabs, the visitor's repos as the panel. */
const maintainersPage = (view: MaintainerReposView) => (
  <>
    <Header section="contribute" />
    <HeaderLine />
    <MaintainersScreen repos={<MaintainerReposPanel view={view} />} />
  </>
);

/** The ledger as its page draws it: the site header and its line, no Contribute tabs. */
const ledgerPage = (view: typeof ledger) => (
  <>
    <Header section="contribute" />
    <HeaderLine />
    <LedgerScreen ledger={view} />
  </>
);

export const CONTRIBUTE_SCREENS: Screen[] = [
  {
    id: 'contribute-landing',
    title: 'Landing',
    area: 'contribute',
    route: '/contribute',
    sources: [
      'app/contribute/components/landing.tsx',
      'app/contribute/components/coming-soon.tsx',
      'app/contribute/components/sign-in-dialog.tsx',
      'lib/contribute/format.ts',
    ],
    states: [
      {
        id: 'visitor',
        title: 'Signed out, once launched',
        path: '/contribute',
        signedOut: true,
        height: 3900,
        // As the layout frames it for a visitor: the header's line, no tabs.
        render: () => (
          <>
            <Header section="contribute" />
            <HeaderLine />
            <Landing viewer="visitor" noted={[]} />
          </>
        ),
      },
    ],
  },
  {
    id: 'contribute-overview',
    title: 'Overview',
    area: 'contribute',
    route: '/contribute',
    sources: [
      'app/contribute/components/overview-status.tsx',
      'app/contribute/components/overview-sections.tsx',
      'app/contribute/components/needs-you-rows.tsx',
      'app/contribute/components/agent-runs.tsx',
      'lib/contribute/overview.ts',
      'lib/contribute/needs-you.ts',
    ],
    states: [
      {
        id: 'working',
        title: 'Agents working',
        path: '/contribute',
        height: 1900,
        render: () => overview(both, busy, true),
      },
      {
        id: 'idle',
        title: 'Nothing running',
        path: '/contribute',
        height: 1700,
        render: () => overview(both, activityOf(), false),
      },
      {
        id: 'working-phone',
        title: 'Agents working · phone',
        path: '/contribute',
        width: 390,
        height: 3400,
        render: () => overview(both, busy, true),
      },
      {
        id: 'needs-you',
        title: 'Needs you: each move, a run working',
        path: '/contribute',
        height: 2100,
        render: () => overview(both, busy, true, needsSome()),
      },
      {
        id: 'needs-you-phone',
        title: 'Needs you · phone',
        path: '/contribute',
        width: 390,
        height: 4600,
        render: () => overview(both, busy, true, needsSome()),
      },
      {
        id: 'follow-through',
        title: 'Lower limits: claims ran out',
        path: '/contribute',
        height: 1800,
        render: () => overview(views.followThrough, activityOf(), false),
      },
      {
        id: 'suspended',
        title: 'Paused for this account',
        path: '/contribute',
        height: 1800,
        render: () => overview(views.suspended, activityOf(), false),
      },
    ],
  },
  {
    id: 'contribute-runs',
    title: 'Agent runs',
    area: 'contribute',
    route: '/contribute/runs',
    sources: ['app/contribute/components/runs-view.tsx', 'lib/contribute/runs.ts'],
    states: [
      {
        id: 'history',
        title: 'History',
        path: '/contribute/runs',
        height: 2000,
        render: () =>
          frame(
            <main className={MAIN}>
              <RunsScreen view={views.active} page={pageOf()} query={runsQueryOf({})} now={NOW} />
            </main>,
          ),
      },
    ],
  },
  {
    id: 'contribute-attempt',
    title: 'A contribution',
    area: 'contribute',
    route: '/contribute/attempts/[id]',
    sources: [
      'app/contribute/components/review-view.tsx',
      'app/contribute/components/attempt-sessions.tsx',
      'app/contribute/components/agent-decisions.tsx',
      'app/contribute/components/next-step.tsx',
      'lib/contribute/sessions.ts',
      'lib/contribute/next-step.ts',
    ],
    states: [
      {
        id: 'review',
        title: 'First attempt, ready for review',
        path: '/contribute/attempts/A_1',
        height: 2000,
        render: () =>
          frame(
            <main className={MAIN}>
              <ReviewScreen view={views.active} attempt={decisionAttempts.went} now={NOW} />
            </main>,
          ),
      },
      {
        id: 'beginner-held',
        title: 'A beginner issue: the first-timers line, and why autopilot left it to you',
        path: '/contribute/attempts/A_1',
        height: 2000,
        render: () =>
          frame(
            <main className={MAIN}>
              <ReviewScreen
                view={views.active}
                attempt={{
                  // Every check passed and the risk is low: autopilot would have submitted it but for the label.
                  ...held,
                  newcomersLabel: 'first-timers-only',
                  reviewReason: 'beginner_issue',
                  reviewReasonSource: 'first-timers-only',
                }}
                now={NOW}
              />
            </main>,
          ),
      },
      {
        id: 'no-go',
        title: 'First attempt, the agent said no-go',
        path: '/contribute/attempts/A_1',
        height: 1300,
        render: () =>
          frame(
            <main className={MAIN}>
              <ReviewScreen view={views.active} attempt={decisionAttempts.noGo} now={NOW} />
            </main>,
          ),
      },
      {
        id: 'check-ran-out',
        title: 'First attempt, the check ran out',
        path: '/contribute/attempts/A_1',
        height: 1300,
        render: () =>
          frame(
            <main className={MAIN}>
              <ReviewScreen view={views.active} attempt={decisionAttempts.ranOut} now={NOW} />
            </main>,
          ),
      },
      {
        id: 'follow-up-run',
        title: 'A follow-up run, ready for review',
        path: '/contribute/attempts/A_F1',
        height: 2000,
        render: () =>
          frame(
            <main className={MAIN}>
              <ReviewScreen
                view={views.active}
                attempt={decisionAttempts.followUp}
                first={followUpAttempts.underWay}
                now={NOW}
              />
            </main>,
          ),
      },
      {
        id: 'pr-open',
        title: 'Pull request open, comments waiting',
        path: '/contribute/attempts/A_1',
        height: 2000,
        render: () =>
          frame(
            <main className={MAIN}>
              <ReviewScreen view={views.active} attempt={followUpAttempts.prNeedsYou} now={NOW} />
            </main>,
          ),
      },
      {
        id: 'next-round',
        title: 'The next run, recommended',
        path: '/contribute/attempts/A_1?session=next',
        height: 1600,
        render: () =>
          frame(
            <main className={MAIN}>
              <ReviewScreen view={views.active} attempt={followUpAttempts.prNeedsYou} next now={NOW} />
            </main>,
          ),
      },
      {
        id: 'next-run',
        title: 'Next step: a run can do it',
        path: '/contribute/attempts/A_8?session=next',
        height: 1900,
        render: () => attemptPage(nextForRun, true),
      },
      {
        id: 'next-only-you',
        title: 'Next step: only you can do it, after run 1',
        path: '/contribute/attempts/A_OC?session=next',
        height: 1700,
        render: () => attemptPage(nextForYou, true),
      },
      {
        id: 'proof-not-connected',
        title: 'Proof from your agent: connect it first',
        path: '/contribute/attempts/A_OC?session=next',
        height: 1900,
        render: () => attemptPage(nextForProof.notConnected, true),
      },
      {
        id: 'proof-connected',
        title: 'Proof from your agent: run the prompt',
        path: '/contribute/attempts/A_OC?session=next',
        height: 1950,
        render: () => attemptPage(nextForProof.connected, true, agentConnected),
      },
      {
        id: 'proof-working',
        title: 'Proof from your agent: it is on it',
        path: '/contribute/attempts/A_OC?session=next',
        height: 1700,
        render: () => attemptPage(nextForProof.working, true, agentConnected),
      },
      {
        id: 'proof-review',
        title: 'Proof from your agent: check it, then post it',
        path: '/contribute/attempts/A_OC?session=next',
        height: 2400,
        render: () => attemptPage(nextForProof.review, true, agentConnected),
      },
      {
        id: 'proof-cannot',
        title: "Proof from your agent: it couldn't capture it",
        path: '/contribute/attempts/A_OC?session=next',
        height: 1900,
        render: () => attemptPage(nextForProof.cannot, true, agentConnected),
      },
      {
        id: 'proof-fix-broken',
        title: "Proof from your agent: the fix doesn't work",
        path: '/contribute/attempts/A_OC?session=next',
        height: 1800,
        render: () => attemptPage(nextForProof.fixBroken, true, agentConnected),
      },
      {
        id: 'proof-posted',
        title: 'Proof from your agent: posted, the bot reads it',
        path: '/contribute/attempts/A_OC?session=next',
        height: 1500,
        render: () => attemptPage(nextForProof.posted, true, agentConnected),
      },
      {
        id: 'next-agreement',
        title: 'Next step: an agreement signed by a comment',
        path: '/contribute/attempts/A_C?session=next',
        height: 1500,
        render: () => attemptPage(nextForAgreement, true),
      },
      {
        id: 'next-dco',
        title: 'Next step: sign off the commits',
        path: '/contribute/attempts/A_T?session=next',
        height: 1500,
        render: () => attemptPage(nextForDco, true),
      },
      {
        id: 'next-dco-phone',
        title: 'Next step: sign off · phone',
        path: '/contribute/attempts/A_T?session=next',
        width: 390,
        height: 2200,
        render: () => attemptPage(nextForDco, true),
      },
      {
        id: 'your-move',
        title: 'The first attempt, its move in one line',
        path: '/contribute/attempts/A_OC',
        height: 1400,
        render: () => attemptPage(nextForYou, false),
      },
      {
        id: 'own-reason',
        title: 'The next run, nothing waiting: your own reason',
        path: '/contribute/attempts/A_1?session=next',
        height: 1600,
        render: () =>
          frame(
            <main className={MAIN}>
              <ReviewScreen view={views.active} attempt={followUpAttempts.quiet} next now={NOW} />
            </main>,
          ),
      },
    ],
  },
  {
    id: 'contribute-connect-agent',
    title: 'Connect your own agent',
    area: 'contribute',
    route: '/contribute/connect',
    sources: ['app/contribute/components/agent-connect.tsx', 'app/contribute/components/connect-view.tsx'],
    states: [
      {
        id: 'proof-prompt',
        title: 'From a proof card: the proof prompt last',
        path: '/contribute/connect?path=agent&proof=A_OC',
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
    id: 'contribute-me',
    title: 'My contributions',
    area: 'contribute',
    route: '/contribute/me',
    sources: [
      'app/contribute/components/contributions-view.tsx',
      'app/contribute/components/needs-you-rows.tsx',
      'lib/contribute/needs-you.ts',
    ],
    states: [
      {
        id: 'list',
        title: 'Open, merged and stopped',
        path: '/contribute/me',
        height: 1800,
        render: () =>
          frame(
            <main className={MAIN}>
              <ContributionsScreen
                view={views.active}
                contributions={contributions}
                attempts={[
                  attempt(),
                  attempt({ attemptId: 'A_2', state: 'RUNNING', costUsd: 0.4 }),
                  attempt({ attemptId: 'A_4', state: 'STOPPED', endReason: 'NO_GO', costUsd: 0.38 }),
                  attempt({ attemptId: 'A_5', state: 'MERGED' }),
                ]}
                now={NOW}
              />
            </main>,
          ),
      },
      {
        id: 'needs-you',
        title: 'Needs you: each move, a run working',
        path: '/contribute/me',
        height: 2600,
        render: () => mine(),
      },
      {
        id: 'needs-you-phone',
        title: 'Needs you · phone',
        path: '/contribute/me',
        width: 390,
        height: 5200,
        render: () => mine(),
      },
    ],
  },
  {
    id: 'contribute-issues',
    title: 'Issues for you',
    area: 'contribute',
    route: '/contribute/issues',
    sources: [
      'app/contribute/components/issues-view.tsx',
      'app/contribute/components/live-issues.tsx',
      'app/contribute/components/contribute-notices.tsx',
    ],
    states: [
      {
        id: 'feed',
        title: 'The feed',
        path: '/contribute/issues',
        height: 1800,
        render: () =>
          frame(
            <main className={MAIN}>
              <IssuesScreen view={views.active} page={issuePage} query={{}} now={NOW} />
            </main>,
          ),
      },
      {
        id: 'first-timers',
        title: 'A first-timers-only issue says so',
        path: '/contribute/issues',
        height: 1800,
        render: () =>
          frame(
            <main className={MAIN}>
              <IssuesScreen
                view={views.active}
                page={{
                  ...issuePage,
                  items: issuePage.items.map((item, index) =>
                    index === 0 ? { ...item, labels: ['first-timers-only'], forNewcomers: true } : item,
                  ),
                }}
                query={{}}
                now={NOW}
              />
            </main>,
          ),
      },
      {
        id: 'new-account',
        title: 'A new account: smaller limits',
        path: '/contribute/issues',
        height: 1800,
        render: () =>
          frame(
            <main className={MAIN}>
              <IssuesScreen view={views.newAccount} page={issuePage} query={{}} now={NOW} />
            </main>,
          ),
      },
      {
        id: 'daily-cap',
        title: "Today's new issues seen",
        path: '/contribute/issues',
        height: 1800,
        render: () =>
          frame(
            <main className={MAIN}>
              <IssuesScreen
                view={views.active}
                page={{ ...issuePage, dailyCap: { limit: 150, reached: true } }}
                query={{}}
                now={NOW}
              />
            </main>,
          ),
      },
    ],
  },
  {
    id: 'contribute-settings',
    title: 'Settings',
    area: 'contribute',
    route: '/contribute/settings',
    sources: [
      'app/contribute/components/settings-view.tsx',
      'app/contribute/components/settings-pages.tsx',
      'app/contribute/components/autopilot-section.tsx',
    ],
    states: [
      {
        id: 'summary',
        title: 'Summary',
        path: '/contribute/settings',
        height: 1800,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
              <SettingsScreen view={views.active} now={NOW} />
            </main>,
          ),
      },
      {
        id: 'autopilot-how',
        title: 'How autopilot works, at launch',
        path: '/contribute/settings',
        height: 1800,
        render: () =>
          frame(
            <OpenDialog
              title={AUTOPILOT_HOW_TITLE}
              page={
                <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
                  <SettingsScreen view={views.autopilotComing} now={NOW} />
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
        path: '/contribute/settings',
        height: 1800,
        render: () =>
          frame(
            <OpenDialog
              title={AUTOPILOT_CONFIRM_TITLE}
              page={
                <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
                  <SettingsScreen view={autopilotOff} now={NOW} />
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
      {
        id: 'new-account',
        title: 'A new account: the limit beside the budget',
        path: '/contribute/settings',
        height: 1900,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
              <SettingsScreen view={views.newAccount} now={NOW} />
            </main>,
          ),
      },
    ],
  },
  {
    id: 'contribute-maintainers',
    title: 'For maintainers',
    area: 'contribute',
    route: '/contribute/maintainers',
    sources: [
      'app/contribute/maintainers/page.tsx',
      'app/contribute/components/maintainers-view.tsx',
      'app/contribute/components/maintainer-repos-form.tsx',
    ],
    states: [
      {
        id: 'signed-out',
        title: 'Signed out',
        path: '/contribute/maintainers',
        signedOut: true,
        height: 1300,
        render: () => maintainersPage({ state: 'signed-out' }),
      },
      {
        id: 'signed-in',
        title: 'Signed in: the repos you maintain',
        path: '/contribute/maintainers',
        height: 1500,
        render: () =>
          maintainersPage({
            state: 'listed',
            data: {
              login: 'octocat',
              truncated: false,
              repos: [
                maintainerRepo({ repoId: 'R_1' }),
                maintainerRepo({
                  repoId: 'R_2',
                  nameWithOwner: 'driftwood-js/driftwood-devtools',
                  permission: 'MAINTAIN',
                  stars: 42,
                  optedOut: true,
                  optedOutAt: '2026-10-20T09:00:00.000Z',
                }),
              ],
            },
          }),
      },
    ],
  },
  {
    id: 'contribute-ledger',
    title: 'Contribute ledger',
    area: 'contribute',
    route: '/contribute/ledger',
    sources: ['app/contribute/ledger/page.tsx', 'app/contribute/components/ledger-view.tsx'],
    states: [
      {
        id: 'preview',
        title: 'Preview: only the list sees it, the bar on top',
        path: '/contribute/ledger',
        height: 2400,
        render: () => ledgerPage(ledger),
      },
      {
        id: 'public',
        title: 'Public, signed out',
        path: '/contribute/ledger',
        signedOut: true,
        height: 2200,
        render: () => ledgerPage(publicLedger),
      },
      {
        id: 'public-phone',
        title: 'Public · phone',
        path: '/contribute/ledger',
        signedOut: true,
        width: 390,
        height: 4600,
        render: () => ledgerPage(publicLedger),
      },
      {
        id: 'empty',
        title: 'No pull requests yet',
        path: '/contribute/ledger',
        height: 1500,
        render: () => ledgerPage(emptyLedger),
      },
    ],
  },
];
