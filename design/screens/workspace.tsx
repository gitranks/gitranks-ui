import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { changedCommentStates, reviewCommentStates, sessionHeadStates } from './contribute-moves';
import { FormSettingsScreen } from '@/app/(workspace)/my/agent/components/agent-pages';
import {
  GithubSettingsScreen,
  PullRequestsSettingsScreen,
} from '@/app/(workspace)/my/settings/components/settings-pages';
import { SettingsScreen } from '@/app/(workspace)/my/settings/components/settings-view';
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
import { ChecksPanel, ReadinessPanel } from '@/components/workspace/pull-request/attempt-panels';
import { PrForm, type PrFormProps } from '@/components/workspace/pull-request/pr-form';
import { RulesOpen } from '@/components/workspace/pull-request/repo-rules';
import { prFormPropsOf, ReviewScreen } from '@/components/workspace/pull-request/review-view';
import { type PullRequestsData, PullRequestsScreen } from '@/components/workspace/pull-requests-screen';
import { RefChips } from '@/components/workspace/ref-chips';
import { ShowMore } from '@/components/workspace/show-more';
import { WorkspaceTabsNav } from '@/components/workspace/workspace-tabs-nav';
import { activityOf, FOLLOW_UP, runOf, WORKING } from '@/lib/contribute/__fixtures__/agent-runs';
import {
  attempts,
  decisionAttempts,
  detail,
  followUpAttempts,
  ownAgentAttempt,
  PATCH,
  repoConventions,
  stopped as stoppedAttempt,
} from '@/lib/contribute/__fixtures__/contribute-attempts';
import { replyWaiting } from '@/lib/contribute/__fixtures__/contribute-overview';
import {
  agentTabViews,
  contributor,
  email,
  mcpToken,
  NOW,
  settings,
  settingsViews,
  views,
} from '@/lib/contribute/__fixtures__/contribute-views';
import { prNotes } from '@/lib/contribute/__fixtures__/maintainers';
import { nextForAgreement, nextForDco, nextForProof } from '@/lib/contribute/__fixtures__/needs-you';
import {
  boardItems,
  emptyPage,
  learnerPage,
  needsYouAnswer,
  pullRequestsPage,
} from '@/lib/contribute/__fixtures__/pull-requests';
import { attemptNoRules, attemptRules } from '@/lib/contribute/__fixtures__/repo-rules';
import { learnerPageOf, OWN_LEARN, pageOf, previewPageOf } from '@/lib/contribute/__fixtures__/runs';
import { filledProfile } from '@/lib/learn/__fixtures__/profile';
import type {
  ContributeActivity,
  ContributeAttemptDetail,
  ContributePrNotes,
  ContributeReplyWaiting,
  ContributeSubmitError,
  ContributeView,
} from '@/lib/workspace/contribute.types';
import { pullRequestsPath } from '@/lib/workspace/paths';
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

/** Every tab, as an account Learn is open to sees them. */
const TABS = ['contribute', 'learn', 'pull-requests', 'agent', 'settings'] as const;

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

/** A contribution's page inside the Contribute frame. */
const page = (children: ReactNode) => frame(<main className={MAIN}>{children}</main>);

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

/** A session's page, the first attempt or a run read under its first attempt (`first`). */
const sessionPage = (session: ContributeAttemptDetail, first?: ContributeAttemptDetail) =>
  frame(
    <main className={MAIN}>
      <ReviewScreen view={views.active} attempt={session} first={first} now={NOW} />
    </main>,
  );

/** A contribution's page drawn whole: its maintainers' say and its waiting replies beside it, the rules open or not. */
const contributionPage = (
  first: ContributeAttemptDetail,
  {
    view = views.active,
    notes,
    replies,
    rulesOpen = false,
  }: { view?: ContributeView; notes?: ContributePrNotes; replies?: ContributeReplyWaiting[]; rulesOpen?: boolean } = {},
) => {
  const page = <ReviewScreen view={view} attempt={first} now={NOW} prNotes={notes} replies={replies} />;
  return frame(
    <main className={MAIN}>{rulesOpen ? <RulesOpen.Provider value>{page}</RulesOpen.Provider> : page}</main>,
  );
};

/** GitHub refused a write: the repository's organization has not approved the app. */
const ORG_REFUSED: ContributeSubmitError = {
  reason: 'org_restricted',
  note: "The repository's organization only lets apps it approved act there.",
  at: '2026-10-28T11:30:00.000Z',
};

/** The pull request's state in the header, each as GitHub may say it. */
const prOpenWith = (patch: Partial<NonNullable<ContributeAttemptDetail['pullRequest']>>) => ({
  ...attempts.prOpen,
  pullRequest: { ...attempts.prOpen.pullRequest!, ...patch },
});

/** A day after the catalogue's clock: how long an issue is still held for the user's own agent. */
const A_DAY_ON = '2026-10-29T12:00:00.000Z';

/** The go the "went" fixture decided, alone: a session that said go and then stopped. */
const wentGo = decisionAttempts.went.goNoGo ?? null;

/** The pull request's form, drawn open in the page frame, with what the page passes it and `patch` on top. */
const prFormPage = (attemptRead: ContributeAttemptDetail, patch: Partial<PrFormProps> = {}) =>
  frame(
    <main className={MAIN}>
      <div className="w-full max-w-4xl">
        <PrForm {...prFormPropsOf(views.active, attemptRead)} {...patch} />
      </div>
    </main>,
  );

/** The change with a line for the repo's changelog, as a repo that asks for one gets it. */
const PATCH_WITH_CHANGELOG = `${PATCH}diff --git a/CHANGELOG.md b/CHANGELOG.md
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -1,2 +1,3 @@
 ## Unreleased
+- fix(router): keep the layout cache for paths with a trailing slash
`;

/** Everything the repo asks, met: a title its check passes, the changelog line, the DCO under a standing consent. */
const repoAsks = detail({
  conventions: repoConventions(),
  dcoRequired: true,
  patch: PATCH_WITH_CHANGELOG,
  result: attempts.review.result && { ...attempts.review.result, prTitle: 'fix(router): keep the layout cache' },
});
const repoAsksProps: Partial<PrFormProps> = { dcoMode: 'STANDING' };

/** The Pull requests tab, as the boards draw it. */
const pullRequests = (data: Partial<PullRequestsData> = {}, activity: ContributeActivity = busy) =>
  frame(
    <main className={MAIN}>
      <PullRequestsScreen
        sides={{ contribute: true, learn: true }}
        learnOpen
        limit={{ count: 3, limit: 8, open: 3 }}
        needsYou={needsYouAnswer()}
        page={pullRequestsPage()}
        filter={{}}
        activity={activity}
        now={NOW}
        {...data}
      />
    </main>,
    activity,
    3,
  );
/** The workspace's shared tabs, both sides: Pull requests, the pull request's page, Agent and Settings. */
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
    id: 'pull-request',
    title: 'A contribution',
    area: 'workspace',
    route: '/my/pull-requests/[owner]/[repo]/[issue]',
    sources: [
      'components/workspace/pull-request/review-view.tsx',
      'components/workspace/pull-request/attempt-sessions.tsx',
      'components/workspace/pull-request/attempt-panels.tsx',
      'components/workspace/pull-request/pr-form.tsx',
      'components/workspace/pull-request/submit-panel.tsx',
      'components/workspace/pull-request/repo-rules.tsx',
      'components/workspace/pull-request/session-pane.tsx',
      'components/workspace/pull-request/session-head.tsx',
      'components/workspace/pull-request/status-line.tsx',
      'components/workspace/pull-request/move-card.tsx',
      'components/workspace/pull-request/also-waiting.tsx',
      'components/workspace/pull-request/moves-first.tsx',
      'components/workspace/pull-request/moves-run.tsx',
      'components/workspace/pull-request/moves-pr.tsx',
      'components/workspace/pull-request/moves-yours.tsx',
      'components/workspace/pull-request/proof-card.tsx',
      'components/workspace/pull-request/head-actions.tsx',
      'components/workspace/pull-request/reply-batch-actions.tsx',
      'components/workspace/pull-request/session-actions.tsx',
      'components/workspace/pull-request/review-comments.tsx',
      'components/workspace/pull-request/comment-row.tsx',
      'components/workspace/pull-request/comment-row-open.tsx',
      'components/workspace/pull-request/comment-row-actions.tsx',
      'components/workspace/pull-request/pull-request-header.tsx',
      'components/workspace/pull-request/stage-line.ts',
      'components/workspace/contribute-notices.tsx',
      'components/workspace/pull-request/pr-notes.tsx',
      'lib/workspace/contribution-moves.ts',
      'lib/workspace/move-cards.ts',
      'lib/workspace/move-cards-pr.ts',
      'lib/workspace/session-status.ts',
      'lib/workspace/run-status.ts',
      'lib/workspace/submit-bounce.ts',
      'lib/workspace/reply-trouble.ts',
      'lib/workspace/review-comments.ts',
      'lib/workspace/comment-actions.ts',
      'lib/workspace/sessions.ts',
      'lib/workspace/next-step.ts',
      'lib/workspace/hard-stop.ts',
    ],
    states: [
      {
        id: 'maintainer-notes',
        title: 'A maintainer stopped our work on the PR, and notes from the maintainers in the rail',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1300,
        render: () =>
          contributionPage(attempts.prOpen, {
            notes: prNotes({ stopped: { login: 'sam-w', at: '2026-10-28T11:04:00.000Z' } }),
          }),
      },
      {
        id: 'notes-hidden',
        title: 'Notes from the maintainers, one hidden',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1200,
        render: () =>
          contributionPage(attempts.prOpen, {
            notes: prNotes({ notes: prNotes().notes.map((note, index) => ({ ...note, hidden: index === 1 })) }),
          }),
      },
      {
        id: 'account-new',
        title: 'A new account: its smaller limits in one line',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1300,
        render: () => contributionPage(attempts.prOpen, { view: views.newAccount }),
      },
      {
        id: 'account-suspended',
        title: 'A suspended account, in one line',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1400,
        render: () => contributionPage(decisionAttempts.went, { view: views.suspended }),
      },
      {
        id: 'pr-checks-running',
        title: 'Pull request open, waiting for review, checks running',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1200,
        render: () => contributionPage(prOpenWith({ checks: 'PENDING' })),
      },
      {
        id: 'pr-approved',
        title: 'Pull request approved',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1200,
        render: () => contributionPage(prOpenWith({ reviewDecision: 'APPROVED' })),
      },
      {
        id: 'pr-merged',
        title: 'Pull request merged',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1200,
        render: () => contributionPage(attempts.merged),
      },
      {
        id: 'pr-closed',
        title: 'Pull request closed without merging',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1200,
        render: () => contributionPage(attempts.closed),
      },
      {
        id: 'contribution-phone',
        title: 'The sessions, the session shown, the rules and the notes, in phone order · phone',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        width: 390,
        height: 1900,
        render: () =>
          contributionPage({ ...followUpAttempts.prNeedsYou, repoRules: attemptRules() }, { notes: prNotes() }),
      },
      {
        id: 'repo-rules',
        title: 'Repo rules in the rail, closed to one line',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 2000,
        render: () => contributionPage({ ...decisionAttempts.went, repoRules: attemptRules() }),
      },
      {
        id: 'repo-rules-open',
        title: 'Repo rules opened: each rule, the repo’s words under it, the limits',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1300,
        render: () => contributionPage({ ...decisionAttempts.went, repoRules: attemptRules() }, { rulesOpen: true }),
      },
      {
        id: 'repo-rules-empty',
        title: 'A repo with no rules: your limits apply',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 2000,
        render: () => contributionPage({ ...decisionAttempts.went, repoRules: attemptNoRules() }, { rulesOpen: true }),
      },
      {
        id: 'repo-rules-org',
        title: 'Repo rules: the organization blocks replies in review threads',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1300,
        render: () =>
          contributionPage(
            { ...attempts.prOpen, repoRules: attemptRules() },
            { rulesOpen: true, replies: [replyWaiting({ state: 'FAILED', lastError: ORG_REFUSED })] },
          ),
      },
      {
        id: 'repo-rules-submit-org',
        title: 'Repo rules: the organization blocked the submit',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 2100,
        render: () =>
          contributionPage(
            {
              ...attempts.bounced,
              submit: { ...attempts.bounced.submit!, lastError: ORG_REFUSED },
              repoRules: attemptRules(),
            },
            { rulesOpen: true },
          ),
      },
      {
        id: 'beginner-held',
        title: 'A beginner issue: the first-timers chip, and why autopilot left it to you',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
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
        id: 'pr-open',
        title: 'Pull request open, comments waiting',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
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
        title: 'The next run, recommended: the waiting comments, one ignored before',
        path: '/my/pull-requests/driftwood-js/driftwood/871?session=next',
        height: 1900,
        render: () => changedCommentStates.nextRound(page),
      },
      {
        id: 'next-own-agent',
        title: 'The next step on a pull request your own agent made: the prompt for it',
        path: '/my/pull-requests/driftwood-js/driftwood/871?session=next',
        height: 1900,
        render: () => changedCommentStates.ownAgentNext(page),
      },
      {
        id: 'proof-not-connected',
        title: 'Proof from your agent: connect it first',
        path: '/my/pull-requests/openclaw/openclaw/160004?session=next',
        height: 1900,
        render: () => attemptPage(nextForProof.notConnected, true),
      },
      {
        id: 'proof-connected',
        title: 'Proof from your agent: run the prompt',
        path: '/my/pull-requests/openclaw/openclaw/160004?session=next',
        height: 1950,
        render: () => attemptPage(nextForProof.connected, true, agentConnected),
      },
      {
        id: 'proof-working',
        title: 'Proof from your agent: it is on it',
        path: '/my/pull-requests/openclaw/openclaw/160004?session=next',
        height: 1700,
        render: () => attemptPage(nextForProof.working, true, agentConnected),
      },
      {
        id: 'proof-review',
        title: 'Proof from your agent: check it, then post it',
        path: '/my/pull-requests/openclaw/openclaw/160004?session=next',
        height: 2400,
        render: () => attemptPage(nextForProof.review, true, agentConnected),
      },
      {
        id: 'proof-cannot',
        title: "Proof from your agent: it couldn't capture it",
        path: '/my/pull-requests/openclaw/openclaw/160004?session=next',
        height: 1900,
        render: () => attemptPage(nextForProof.cannot, true, agentConnected),
      },
      {
        id: 'proof-fix-broken',
        title: "Proof from your agent: the fix doesn't work",
        path: '/my/pull-requests/openclaw/openclaw/160004?session=next',
        height: 1800,
        render: () => attemptPage(nextForProof.fixBroken, true, agentConnected),
      },
      {
        id: 'proof-posted',
        title: 'Proof from your agent: posted, the bot reads it',
        path: '/my/pull-requests/openclaw/openclaw/160004?session=next',
        height: 1500,
        render: () => attemptPage(nextForProof.posted, true, agentConnected),
      },
      {
        id: 'next-agreement',
        title: 'Next step: an agreement signed by a comment',
        path: '/my/pull-requests/lantern-ui/lantern/3870?session=next',
        height: 1500,
        render: () => attemptPage(nextForAgreement, true),
      },
      {
        id: 'next-dco',
        title: 'Next step: sign off the commits',
        path: '/my/pull-requests/tern-lang/tern-fmt/4400?session=next',
        height: 1500,
        render: () => attemptPage(nextForDco, true),
      },
      {
        id: 'own-reason',
        title: 'The next run, nothing waiting: your own reason',
        path: '/my/pull-requests/driftwood-js/driftwood/871?session=next',
        height: 1600,
        render: () =>
          frame(
            <main className={MAIN}>
              <ReviewScreen view={views.active} attempt={followUpAttempts.quiet} next now={NOW} />
            </main>,
          ),
      },
      {
        id: 'decided-at-limit',
        title: "First attempt, a no-go decided at the check's cap",
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1300,
        render: () =>
          sessionPage({
            ...decisionAttempts.noGo,
            checkLimit: { limit: 'budget', decided: true },
            goNoGo: decisionAttempts.noGo.goNoGo && { ...decisionAttempts.noGo.goNoGo, decidedAtLimit: 'budget' },
          }),
      },
      {
        id: 'working-go',
        title: 'First attempt working, the go decided',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1300,
        render: () => sessionPage({ ...attempts.running, goNoGo: wentGo }),
      },
      {
        id: 'brief-only',
        title: 'First attempt stopped at your limit after a go, with its brief',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1300,
        render: () =>
          sessionPage({ ...stoppedAttempt('BUDGET'), goNoGo: wentGo, brief: decisionAttempts.went.brief ?? null }),
      },
      {
        id: 'own-agent-review',
        title: "Your own agent's change, ready for review",
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 2200,
        render: () =>
          sessionPage({
            ...ownAgentAttempt,
            leaseUntil: A_DAY_ON,
            changesRequested: { note: 'Add a test for the trailing slash.', at: '2026-10-28T10:00:00.000Z' },
          }),
      },
      {
        id: 'own-agent-working',
        title: 'Your own agent holds the issue, nothing submitted yet',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1300,
        render: () =>
          sessionPage({
            ...ownAgentAttempt,
            state: 'RUNNING',
            result: null,
            agent: null,
            patch: null,
            checks: [],
            checksPassed: null,
            leaseUntil: A_DAY_ON,
          }),
      },
      {
        id: 'own-agent-activity',
        title: 'Your own agent let the issue go: the Activity tab',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1300,
        render: () =>
          sessionPage({
            ...ownAgentAttempt,
            state: 'STOPPED',
            endReason: 'MCP_IDLE',
            patch: null,
            checks: [],
            checksPassed: null,
            result: null,
            changesRequested: { note: 'Add a test for the trailing slash.', at: '2026-10-28T10:00:00.000Z' },
          }),
      },
      {
        id: 'run-note',
        title: 'A run that stopped, with your note',
        path: '/my/pull-requests/driftwood-js/driftwood/871/runs/A_F1',
        height: 1300,
        render: () =>
          sessionPage(
            {
              ...followUpAttempts.stopped,
              patch: null,
              checks: [],
              checksPassed: null,
              result: null,
              followUpOf: followUpAttempts.stopped.followUpOf && {
                ...followUpAttempts.stopped.followUpOf,
                trigger: 'own',
                reason: 'Fix the docs example.',
              },
            },
            followUpAttempts.underWay,
          ),
      },
      {
        id: 'run-replies-only',
        title: 'A run that made replies only: the Checks tab open',
        path: '/my/pull-requests/driftwood-js/driftwood/871/runs/A_F1',
        height: 1800,
        render: () => sessionPage(followUpAttempts.repliesOnly, followUpAttempts.underWay),
      },
      {
        id: 'bare',
        title: 'The API answered without the optional parts',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1300,
        render: () => sessionPage(attempts.bare),
      },
      ...sessionHeadStates(page),
      ...reviewCommentStates(page),
    ],
  },
  {
    id: 'pull-request-form',
    title: 'The pull request form',
    area: 'workspace',
    route: '/my/pull-requests/[owner]/[repo]/[issue]',
    sources: ['components/workspace/pull-request/pr-form.tsx', 'lib/workspace/pr-conventions.ts'],
    states: [
      {
        id: 'repo-asks',
        title: 'Everything the repo asks, met',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1300,
        render: () => prFormPage(repoAsks, repoAsksProps),
      },
      {
        id: 'title-blocked',
        title: "A title the repo's check would fail, DCO not ticked",
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1300,
        render: () =>
          prFormPage(detail({ conventions: repoConventions(), title: 'Layout cache drops nested routes' }), {
            dcoRequired: true,
            dcoMode: 'ASK',
          }),
      },
      {
        id: 'prefix',
        title: "The repo's agent prefix missing; AI trailers banned",
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1300,
        render: () =>
          prFormPage(
            detail({
              conventions: repoConventions({ titlePrefix: '[AI]' }),
              result: attempts.review.result && {
                ...attempts.review.result,
                prTitle: 'fix(router): keep the layout cache',
              },
              prCoAuthored: false,
              prFooter:
                'This PR was written in part with the assistance of generative AI.\n\n<sub>Made with [GitRanks Contribute](https://gitranks.com) · Reviewed and submitted by @octocat</sub>',
            }),
          ),
      },
      {
        id: 'by-human',
        title: 'A template the repo leaves to you, a CLA signed by comment, no changelog line',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1400,
        render: () =>
          prFormPage(
            detail({
              conventions: repoConventions({
                templateByHuman: true,
                cla: {
                  check: 'cla-check',
                  signUrl: 'https://github.com/driftwood-js/driftwood/blob/main/CLA.md',
                  agreement: 'CLA',
                  signComment: 'I have read the CLA document and I hereby sign the CLA.',
                },
                changelog: { kind: 'FILE', path: 'CHANGELOG.md', required: true, source: '9 of the last 10' },
              }),
              result: attempts.review.result && {
                ...attempts.review.result,
                prTitle: 'fix(router): keep the layout cache',
              },
            }),
          ),
      },
      {
        id: 'grant-first',
        title: 'GitHub access asked on the button',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1100,
        render: () => prFormPage(attempts.review, { grantNeeded: true, again: false }),
      },
      {
        id: 'preview',
        title: "The description's Preview pane",
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1300,
        render: () => prFormPage(repoAsks, { ...repoAsksProps, defaultPane: 'preview' }),
      },
      {
        id: 'phone',
        title: 'Everything the repo asks · phone',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        width: 390,
        height: 2000,
        render: () => prFormPage(repoAsks, repoAsksProps),
      },
    ],
  },
  {
    id: 'pull-request-checks',
    title: 'The Checks tab',
    area: 'workspace',
    route: '/my/pull-requests/[owner]/[repo]/[issue]',
    sources: ['components/workspace/pull-request/attempt-panels.tsx'],
    states: [
      {
        id: 'readiness-open',
        title: 'Our checks and the tests, with how the repo builds open',
        path: '/my/pull-requests/driftwood-js/driftwood/871',
        height: 1100,
        render: () =>
          frame(
            <main className={MAIN}>
              <div className="flex w-full max-w-4xl flex-col gap-4">
                <ChecksPanel attempt={attempts.review} />
                <ReadinessPanel attempt={attempts.review} open />
              </div>
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
                learnOpen
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
    id: 'pull-requests',
    title: 'Pull requests',
    area: 'workspace',
    route: '/my/pull-requests',
    sources: [
      'components/workspace/pull-requests-screen.tsx',
      'components/workspace/needs-you-row.tsx',
      'lib/workspace/needs-you-words.ts',
    ],
    states: [
      {
        id: 'list',
        title: 'Needs you, in progress, and every pull request',
        path: '/my/pull-requests',
        height: 1500,
        render: () => pullRequests(),
      },
      {
        id: 'empty',
        title: 'Nothing yet: two ways to send the first one',
        path: '/my/pull-requests',
        height: 520,
        render: () =>
          pullRequests(
            { needsYou: needsYouAnswer({ items: [], inProgress: [], count: 0 }), page: emptyPage(), sides: null },
            activityOf(),
          ),
      },
      {
        id: 'learner',
        title: 'A learner: no "Made with", the lesson in the last column',
        path: '/my/pull-requests',
        height: 900,
        render: () =>
          pullRequests(
            {
              sides: { contribute: false, learn: true },
              limit: { count: 1, limit: 8, open: 1 },
              needsYou: needsYouAnswer({ items: [boardItems()[1]], inProgress: [], count: 1 }),
              page: learnerPage(),
            },
            activityOf(),
          ),
      },
      {
        id: 'phone',
        title: 'Phone',
        path: '/my/pull-requests',
        width: 390,
        height: 2300,
        render: () => pullRequests(),
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
            <Pagination page={2} total={46} noun="pull request" hrefOf={(page) => pullRequestsPath({ page })} />
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
              <AgentScreen view={agentTabViews.nothing} learnOpen runs={pageOf({ items: [] })} now={NOW} />
            </main>,
          ),
      },
      {
        id: 'nothing-connected-contribute',
        title: 'Nothing connected, Learn not open to the account: no word of Learn',
        path: '/my/agent',
        height: 800,
        render: () => (
          <>
            <Header />
            <WorkspaceTabsNav tabs={TABS.filter((tab) => tab !== 'learn')} activity={activityOf()} needsYou={2} />
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-16">
              <AgentScreen view={agentTabViews.nothing} runs={pageOf({ items: [] })} now={NOW} />
            </main>
          </>
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
              <AgentScreen view={agentTabViews.notEntered} learnOpen runs={pageOf({ items: [] })} now={NOW} />
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
              <AgentScreen view={agentTabViews.both} learnOpen runs={previewPageOf()} now={NOW} />
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
                learnOpen
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
                learnOpen
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
              <AgentScreen view={agentTabViews.keyInvalid} learnOpen runs={undefined} now={NOW} />
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
              <AgentScreen view={agentTabViews.both} learnOpen runs={previewPageOf()} now={NOW} />
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
      {
        id: 'new-account',
        title: 'A new account: the limit beside the budget',
        path: '/my/agent',
        height: 1900,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 pb-16">
              <AgentScreen view={views.newAccount} runs={previewPageOf()} now={NOW} />
            </main>,
          ),
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    area: 'workspace',
    route: '/my/settings',
    sources: [
      'app/(workspace)/my/settings/components/settings-view.tsx',
      'components/workspace/settings/email-rows.tsx',
      'lib/workspace/email-settings.ts',
      'components/workspace/settings/delete-data-section.tsx',
    ],
    states: [
      {
        id: 'contributor',
        title: 'A contributor: For learning closed to a line',
        path: '/my/settings',
        height: 1650,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
              <SettingsScreen view={settingsViews.contributor} learnOpen email={email.on} openPrs={3} />
            </main>,
          ),
      },
      {
        id: 'learner',
        title: 'A learner: For learning first, For contributing closed',
        path: '/my/settings',
        height: 1650,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
              <SettingsScreen
                view={settingsViews.learner}
                learnOpen
                email={email.on}
                profile={filledProfile}
                openPrs={1}
              />
            </main>,
          ),
      },
      {
        id: 'email-hint',
        title: 'Opened from an email\'s "one summary a day instead" link: asked before switching',
        path: '/my/settings?email=daily#email',
        height: 1900,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
              <SettingsScreen
                view={settingsViews.both}
                learnOpen
                email={email.on}
                emailHint="ONCE_A_DAY"
                profile={filledProfile}
                openPrs={3}
              />
            </main>,
          ),
      },
      {
        id: 'email-no-address',
        title: 'No email address: both Email rows disabled under why',
        path: '/my/settings',
        height: 1650,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
              <SettingsScreen view={settingsViews.contributor} learnOpen email={email.noAddress} openPrs={3} />
            </main>,
          ),
      },
      {
        id: 'email-daily-phone',
        title: 'Once a day, the choices wrapped under the title · phone',
        path: '/my/settings',
        width: 390,
        height: 2300,
        render: () =>
          frame(
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-16">
              <SettingsScreen view={settingsViews.contributor} learnOpen email={email.daily} openPrs={3} />
            </main>,
          ),
      },
    ],
  },
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
