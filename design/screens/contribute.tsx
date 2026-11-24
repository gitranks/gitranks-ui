import type { ComponentProps, ReactNode } from 'react';

import type { Screen } from '../registry';
import { CONTRIBUTE_FLOW_SCREENS } from './getting-in';
import { ContributeTabScreen } from '@/app/(workspace)/contribute/components/contribute-tab';
import { FairUseAnswerScreen } from '@/app/(workspace)/contribute/components/fair-use-answer';
import { ContributeBadgePreview } from '@/app/contribute/components/contribute-badge-preview';
import { FaqScreen } from '@/app/contribute/components/faq';
import { Landing } from '@/app/contribute/components/landing';
import { LedgerScreen } from '@/app/contribute/components/ledger-view';
import {
  MaintainerReposPanel,
  MaintainersFoot,
  MaintainersScreen,
  PrStrip,
} from '@/app/contribute/components/maintainers-view';
import { McpDocsScreen } from '@/app/contribute/components/mcp-docs';
import { HelpedSent, ReportSent } from '@/app/contribute/components/pr-feedback-forms';
import { PrFeedbackScreen } from '@/app/contribute/components/pr-feedback-view';
import { MorePages } from '@/app/contribute/components/public-pages';
import { TermsScreen } from '@/app/terms/terms';
import { Header } from '@/components/header/header';
import { CONTRIBUTE_MADE_LINKS, MadePage } from '@/components/workspace/fix-page/made-page';
import { HeaderLine } from '@/components/workspace/header-line';
import { WorkspaceTabsNav } from '@/components/workspace/workspace-tabs-nav';
import { activityOf, FOLLOW_UP, runOf, WORKING } from '@/lib/contribute/__fixtures__/agent-runs';
import { issuePage } from '@/lib/contribute/__fixtures__/contribute-overview';
import { contributor, mcpToken, NOW, settings, views } from '@/lib/contribute/__fixtures__/contribute-views';
import {
  answeredNotice,
  blockNotice,
  fairUse,
  fairUseBlocked,
  fairUseNotice,
  rulesBanner,
  warningNotice,
} from '@/lib/contribute/__fixtures__/fair-use';
import { emptyLedger, ledger, publicLedger } from '@/lib/contribute/__fixtures__/ledger';
import {
  allLiveFacts,
  maintainerFacts,
  maintainerRepo,
  prCard,
  prReportSent,
  prViewer,
} from '@/lib/contribute/__fixtures__/maintainers';
import { issueRules, maintainerConfig, maintainerRules } from '@/lib/contribute/__fixtures__/repo-rules';
import type { MaintainerReposView } from '@/lib/contribute/maintainers.data';
import type { PrReportRead } from '@/lib/contribute/pr-feedback.data';
import {
  autopilotTimeline,
  closedTimeline,
  mergedTimeline,
  ownAgentTimeline,
  stoppedTimeline,
} from '@/lib/workspace/__fixtures__/pr-timeline';
import type {
  ContributeActivity,
  ContributeFairUseNotice,
  ContributeIssuePage,
  ContributeMaintainerFacts,
  ContributePrCard,
  ContributeView,
} from '@/lib/workspace/contribute.types';
import { GETTING_IN_PATHS } from '@/lib/workspace/paths';
import type { PrFeedbackFlow } from '@/lib/workspace/pr-feedback';
import type { PrTimeline } from '@/lib/workspace/pr-timeline.types';
import { prTimelinePath } from '@/lib/workspace/pr-timeline-path';

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

/** Every tab, as an account that has entered sees them. */
const TABS = ['contribute', 'learn', 'pull-requests', 'agent', 'settings'] as const;

/** The page as the workspace's layout frames it: the site header (it marks itself by the path), then the tabs. */
const frame = (children: ReactNode, activity: ContributeActivity = activityOf(), needsYou: number | null = 2) => (
  <>
    <Header />
    <WorkspaceTabsNav tabs={TABS} activity={activity} needsYou={needsYou} />
    {children}
  </>
);

/** The feed with its repos' rules: a repo with several, one where autopilot is the only one, and one with none. */
const rulesPage: ContributeIssuePage = {
  ...issuePage,
  items: issuePage.items.map((item, index) => ({
    ...item,
    repoRules: [
      issueRules(),
      issueRules({ lines: issueRules().lines.slice(0, 3) }),
      issueRules({ lines: issueRules().lines.slice(0, 3) }),
      { manualOnly: false, lines: [] },
    ][index],
  })),
};

/** The Contribute tab, as its page reads it: both agents, the numbers, Learn open, nothing paused. */
const tab = (
  view: ContributeView,
  activity: ContributeActivity,
  patch: Partial<ComponentProps<typeof ContributeTabScreen>> = {},
) =>
  frame(
    <ContributeTabScreen
      view={view}
      agents={{ hosted: true, own: true }}
      tab={{ totals: { open: 2, merged: 7, closed: 4, reposHelped: 6 }, hostedLevel: 'MANUAL' }}
      page={issuePage}
      activity={activity}
      counts={{ prBound: 2 }}
      query={{}}
      now={NOW}
      {...patch}
    />,
    activity,
  );

const busy = activityOf(WORKING, FOLLOW_UP, own, stopped);
/** A message's answer page, as the workspace's layout frames it. */
const answerPage = (notice: ContributeFairUseNotice) =>
  frame(
    <main className="mx-auto flex w-full max-w-3xl flex-col px-4 pt-8 pb-16">
      <FairUseAnswerScreen notice={notice} byEmail />
    </main>,
  );
const ORG_ACCESS_URL = 'https://github.com/settings/applications';

/** A Learn pull request's footer link: its card, and its public page ("See their answers"). */
const learnPrCard = () => prCard({ learn: { slug: null } });

/**
 * The page for maintainers: open to everyone, the site header with no tabs, the visitor's repos in "Opt out". `from`:
 * the PR a footer link came from, on top and in the question at the foot.
 */
const maintainersPage = (
  view: MaintainerReposView,
  {
    shown = false,
    from = null,
    facts = maintainerFacts(),
  }: { shown?: boolean; from?: ContributePrCard | null; facts?: ContributeMaintainerFacts } = {},
) => (
  <>
    <Header section="contribute" />
    <HeaderLine />
    <MaintainersScreen
      facts={facts}
      strip={from ? <PrStrip card={from} timelinePath={from.learn ? prTimelinePath(from) : null} /> : null}
      badge={<ContributeBadgePreview />}
      badgeRepo={from ? from.nameWithOwner : undefined}
      foot={<MaintainersFoot card={from} />}
      repos={<MaintainerReposPanel view={view} orgAccessUrl={ORG_ACCESS_URL} facts={facts} />}
      more={shown ? <MorePages current="maintainers" /> : null}
    />
  </>
);

/** A report page, as its route draws it: under the site header, no tabs. */
const reportPage = (read: PrReportRead, flow: PrFeedbackFlow = 'report', initial = {}) => (
  <>
    <Header section="contribute" />
    <HeaderLine />
    <PrFeedbackScreen
      target={{ from: prCard().attemptId }}
      flow={flow}
      read={read}
      orgAccessUrl={ORG_ACCESS_URL}
      initial={initial}
    />
  </>
);

/** What a report page shows once it is sent: the form's own next state. */
const sentPage = (flow: PrFeedbackFlow) => (
  <>
    <Header section="contribute" />
    <HeaderLine />
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-8 pb-16">
      <span className="text-xs font-semibold tracking-[0.08em] text-primary uppercase">
        {flow === 'helped' ? 'This PR helped' : 'Report a pull request'}
      </span>
      {flow === 'helped' ? (
        <HelpedSent card={prCard()} />
      ) : (
        <ReportSent card={prCard()} result={prReportSent()} requested={['STOP_PR']} replyTo="sam@driftwood.dev" />
      )}
    </main>
  </>
);

const REPORT_FILLED = {
  reasons: ['IGNORES_CONTRIBUTING' as const],
  details: 'It changed our lockfile and the generated docs, which CONTRIBUTING asks not to touch.',
  actions: ['STOP_PR' as const],
};
const found = (viewer = prViewer()): PrReportRead => ({ state: 'found', card: prCard(), viewer });

/** The ledger as its page draws it: the site header and its line, no Contribute tabs. */
const ledgerPage = (view: typeof ledger) => (
  <>
    <Header section="contribute" />
    <HeaderLine />
    <LedgerScreen ledger={view} />
  </>
);

/** A pull request's public timeline as its page draws it: the site header, no Contribute tabs. */
const prTimelinePage = (timeline: PrTimeline) => (
  <>
    <Header section="contribute" />
    <MadePage
      timeline={timeline}
      made="CONTRIBUTE"
      helped={timeline.helped ? { helpedBy: ['mara-k', 'lindqvist'], helpedNamed: 2 } : null}
      {...CONTRIBUTE_MADE_LINKS}
    />
  </>
);
const PR_TIMELINE_PATH = '/contribute/pr/driftwood-js/driftwood/1419';

/** A page open to everyone: the site header with no tabs, as a visitor sees it. */
const publicPage = (page: ReactNode) => (
  <>
    <Header section="contribute" />
    <HeaderLine />
    {page}
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
      'app/contribute/components/landing-view.tsx',
      'app/(public)/contribute/about/page.tsx',
      'components/workspace/getting-in/resume-link.tsx',
      'components/workspace/agent/coming-soon.tsx',
      'components/workspace/sign-in-dialog.tsx',
      'lib/workspace/format.ts',
    ],
    states: [
      {
        id: 'visitor',
        title: 'Signed out, once launched',
        path: '/contribute',
        signedOut: true,
        height: 4100,
        // As the layout frames it for a visitor: the header's line, no tabs.
        render: () => (
          <>
            <Header section="contribute" />
            <HeaderLine />
            <Landing viewer="visitor" start={{ href: GETTING_IN_PATHS.contributeWork, signedIn: false }} noted={[]} />
          </>
        ),
      },
      {
        id: 'phone',
        title: 'Signed out, on a phone: the sections stacked, Start contributing full width',
        path: '/contribute',
        signedOut: true,
        width: 390,
        height: 7700,
        render: () => (
          <>
            <Header section="contribute" />
            <HeaderLine />
            <Landing viewer="visitor" start={{ href: GETTING_IN_PATHS.contributeWork, signedIn: false }} noted={[]} />
          </>
        ),
      },
      {
        id: 'about',
        title: 'How Contribute works, for a member: the same page, Open Contribute',
        path: '/contribute/about',
        height: 4100,
        render: () => (
          <>
            <Header section="contribute" />
            <HeaderLine />
            <Landing viewer="signed-in" start={{ member: true }} noted={[]} />
          </>
        ),
      },
    ],
  },
  ...CONTRIBUTE_FLOW_SCREENS,
  {
    id: 'contribute-tab',
    title: 'Contribute tab',
    area: 'contribute',
    route: '/contribute',
    sources: [
      'app/(workspace)/contribute/page.tsx',
      'app/(workspace)/contribute/components/contribute-tab.tsx',
      'app/(workspace)/contribute/components/contribute-tab-view.tsx',
      'app/(workspace)/contribute/components/issue-list.tsx',
      'app/(workspace)/contribute/components/picks-dialog.tsx',
      'components/workspace/issue-row.tsx',
      'components/workspace/right-now.tsx',
      'lib/contribute/contribute-tab.ts',
    ],
    states: [
      {
        id: 'working',
        title: 'Agents working: Right now above the issues',
        path: '/contribute',
        height: 2100,
        render: () => tab(both, busy),
      },
      {
        id: 'limit',
        title: 'At the open pull request limit: its notice over the rows, which have no Start',
        path: '/contribute',
        height: 1600,
        render: () => tab(both, activityOf(), { counts: { prBound: 3 } }),
      },
      {
        id: 'nothing-connected',
        title: 'Nothing connected now: every Start opens the Start page',
        path: '/contribute',
        height: 1700,
        render: () => tab(both, activityOf(), { agents: { hosted: false, own: false } }),
      },
      {
        id: 'first-picks',
        title: 'The first picks still being ranked',
        path: '/contribute',
        height: 900,
        render: () => tab(both, activityOf(), { page: { items: [], next: null, total: 0, computedAt: null } }),
      },
      {
        id: 'held',
        title: 'The account is held: no issues, no Start',
        path: '/contribute',
        height: 800,
        render: () => tab(views.suspended, activityOf()),
      },
      {
        id: 'repo-rules',
        title: 'Each repo’s rules on its row, closed; a repo with none says so',
        path: '/contribute',
        height: 1800,
        render: () => tab(both, activityOf(), { page: rulesPage }),
      },
      {
        id: 'phone',
        title: 'Agents working · phone',
        path: '/contribute',
        width: 390,
        height: 3600,
        render: () => tab(both, busy),
      },
      {
        id: 'rules-banner',
        title: 'The Terms banner for people who connected an agent before the rule',
        path: '/contribute',
        height: 1300,
        render: () => tab(both, activityOf(), { page: issuePage, fairUse: fairUse({ rulesBanner }) }),
      },
      {
        id: 'fair-use-message',
        title: 'A message after a pull request opened outside GitRanks: Answer, the Terms, a close button',
        path: '/contribute',
        height: 1400,
        render: () => tab(both, activityOf(), { page: issuePage, fairUse: fairUse({ notices: [fairUseNotice()] }) }),
      },
      {
        id: 'fair-use-blocked',
        title: 'Blocked by a fair-use rule: the block’s message, which cannot be closed; no issues',
        path: '/contribute',
        height: 900,
        render: () =>
          tab(fairUseBlocked, activityOf(), {
            page: null,
            fairUse: fairUse({ notices: [blockNotice], block: blockNotice }),
          }),
      },
    ],
  },
  {
    id: 'contribute-answer',
    title: 'A message from GitRanks: the answer page',
    area: 'contribute',
    route: '/contribute/answer/[noticeId]',
    sources: [
      'app/(workspace)/contribute/answer/[noticeId]/page.tsx',
      'app/(workspace)/contribute/components/fair-use-answer.tsx',
      'components/workspace/fair-use-message.tsx',
      'lib/workspace/fair-use.ts',
    ],
    states: [
      {
        id: 'open',
        title: 'Opened from the email, the banner or the agent: the message, its choices and a comment',
        path: '/contribute/answer/583231-outsidePr-1-1',
        height: 1250,
        render: () => answerPage(fairUseNotice()),
      },
      {
        id: 'sent',
        title: 'Sent: the form turns into the answer in the same place; the message stays',
        path: '/contribute/answer/583231-outsidePr-1-1',
        height: 1250,
        render: () => answerPage(answeredNotice),
      },
      {
        id: 'warning',
        title: 'The warning: no choices, a comment only',
        path: '/contribute/answer/583231-outsidePr-2-1',
        height: 1050,
        render: () => answerPage(warningNotice),
      },
      {
        id: 'blocked',
        title: 'Blocked: a comment only',
        path: '/contribute/answer/583231-outsidePr-3-1',
        height: 1050,
        render: () => answerPage(blockNotice),
      },
    ],
  },
  {
    id: 'contribute-maintainers',
    title: 'For maintainers',
    area: 'contribute',
    route: '/contribute/maintainers',
    sources: [
      'app/(public)/contribute/maintainers/page.tsx',
      'app/contribute/components/maintainers-view.tsx',
      'app/contribute/components/maintainer-repos-form.tsx',
      'app/contribute/components/maintainer-repo-settings.tsx',
    ],
    states: [
      {
        id: 'signed-out-shown',
        title: 'Signed out, once Contribute is open',
        path: '/contribute/maintainers',
        signedOut: true,
        height: 1300,
        render: () => maintainersPage({ state: 'signed-out' }, { shown: true }),
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
                maintainerRepo({
                  repoId: 'R_1',
                  blockedContributors: [
                    { login: 'mira-dev', since: '2026-10-27T19:04:00.000Z', by: 'sam-w', feedbackId: 'F_1' },
                  ],
                  stoppedPrs: [{ number: 912, since: '2026-10-27T19:04:00.000Z', by: 'sam-w', feedbackId: 'F_1' }],
                }),
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
      {
        id: 'signed-in-rules',
        title: 'Your repos: what we read and the settings, one key set in the file',
        path: '/contribute/maintainers',
        height: 5200,
        render: () =>
          maintainersPage(
            {
              state: 'listed',
              data: {
                login: 'octocat',
                truncated: false,
                repos: [
                  maintainerRepo({ repoId: 'R_1', config: maintainerConfig(), rules: maintainerRules() }),
                  maintainerRepo({
                    repoId: 'R_2',
                    nameWithOwner: 'driftwood-js/driftwood-devtools',
                    permission: 'MAINTAIN',
                    stars: 42,
                    optedOut: true,
                    optedOutAt: '2026-10-20T09:00:00.000Z',
                    config: maintainerConfig().map((value) => ({
                      ...value,
                      value: null,
                      source: null,
                      setBy: null,
                      ignoredRaw: null,
                    })),
                    rules: { manualOnly: false, lines: [] },
                  }),
                ],
              },
            },
            { facts: allLiveFacts() },
          ),
      },
      {
        id: 'from-pr',
        title: 'Arriving from a PR footer',
        path: '/contribute/maintainers?from=6650a1b2c3d4e5f6a7b8c9d0',
        signedOut: true,
        height: 3700,
        render: () => maintainersPage({ state: 'signed-out' }, { shown: true, from: prCard() }),
      },
      {
        id: 'from-learn-pr',
        title: 'Arriving from a Learn PR footer: the line about Learn, and its part under the steps',
        path: '/contribute/maintainers?from=6650a1b2c3d4e5f6a7b8c9d0',
        signedOut: true,
        height: 3800,
        render: () => maintainersPage({ state: 'signed-out' }, { shown: true, from: learnPrCard() }),
      },
      {
        id: 'from-learn-pr-phone',
        title: 'Phone, from a Learn PR footer',
        path: '/contribute/maintainers?from=6650a1b2c3d4e5f6a7b8c9d0',
        signedOut: true,
        width: 390,
        height: 7800,
        render: () => maintainersPage({ state: 'signed-out' }, { shown: true, from: learnPrCard() }),
      },
      {
        id: 'phone',
        title: 'Phone',
        path: '/contribute/maintainers',
        signedOut: true,
        width: 390,
        height: 7000,
        render: () => maintainersPage({ state: 'signed-out' }, { shown: true }),
      },
    ],
  },
  {
    id: 'contribute-maintainers-report',
    title: 'Report a PR, or say it helped',
    area: 'contribute',
    route: '/contribute/maintainers/report',
    sources: [
      'app/(public)/contribute/maintainers/report/page.tsx',
      'app/contribute/components/pr-feedback-view.tsx',
      'app/contribute/components/pr-feedback-forms.tsx',
      'lib/workspace/pr-feedback.ts',
    ],
    states: [
      {
        id: 'sign-in',
        title: 'Signed out: sign in first',
        path: '/contribute/maintainers/report?from=6650a1b2c3d4e5f6a7b8c9d0',
        signedOut: true,
        height: 900,
        render: () => reportPage({ state: 'signed-out', card: prCard() }),
      },
      {
        id: 'maintainer',
        title: 'A maintainer: the actions apply at once',
        path: '/contribute/maintainers/report?from=6650a1b2c3d4e5f6a7b8c9d0',
        height: 1300,
        render: () => reportPage(found(), 'report', REPORT_FILLED),
      },
      {
        id: 'collaborator',
        title: 'A collaborator: reports only',
        path: '/contribute/maintainers/report?from=6650a1b2c3d4e5f6a7b8c9d0',
        height: 1400,
        render: () => reportPage(found(prViewer({ role: 'COLLABORATOR', login: 'lee-c' })), 'report', REPORT_FILLED),
      },
      {
        id: 'user',
        title: 'Anyone else signed in, in an org that may hide roles',
        path: '/contribute/maintainers/report?from=6650a1b2c3d4e5f6a7b8c9d0',
        height: 1450,
        render: () =>
          reportPage(
            found(
              prViewer({ role: 'USER', login: 'ana-k', restrictedOrg: 'driftwood-js', replyTo: 'ana@example.org' }),
            ),
            'report',
            REPORT_FILLED,
          ),
      },
      {
        id: 'unconfirmed',
        title: 'GitHub did not answer: the role is not confirmed',
        path: '/contribute/maintainers/report?from=6650a1b2c3d4e5f6a7b8c9d0',
        height: 1400,
        render: () =>
          reportPage(found(prViewer({ role: 'USER', roleConfirmed: false, login: null, replyTo: null })), 'report'),
      },
      {
        id: 'own-pr',
        title: 'The PR’s own contributor',
        path: '/contribute/maintainers/report?from=6650a1b2c3d4e5f6a7b8c9d0',
        height: 700,
        render: () =>
          reportPage({ state: 'found', card: prCard({ isAuthor: true }), viewer: prViewer({ login: 'mira-dev' }) }),
      },
      {
        id: 'github-down',
        title: 'GitHub did not answer: try again',
        path: '/contribute/maintainers/report?from=6650a1b2c3d4e5f6a7b8c9d0',
        height: 700,
        render: () => reportPage({ state: 'failed', error: 'GITHUB_UNAVAILABLE', card: prCard() }),
      },
      {
        id: 'not-ours',
        title: 'Not one of our PRs',
        path: '/contribute/maintainers/report?pr=driftwood-js%2Fdriftwood%23913',
        height: 700,
        render: () => reportPage({ state: 'failed', error: 'NOT_OURS', card: null }),
      },
      {
        id: 'report-sent',
        title: 'Report sent: one action applied',
        path: '/contribute/maintainers/report?from=6650a1b2c3d4e5f6a7b8c9d0',
        height: 950,
        render: () => sentPage('report'),
      },
      {
        id: 'helped',
        title: 'This PR helped',
        path: '/contribute/maintainers/report?from=6650a1b2c3d4e5f6a7b8c9d0&kind=helped',
        height: 1100,
        render: () =>
          reportPage(found(), 'helped', {
            likes: ['SOLVED_WELL', 'SMALL_AND_CLEAR'],
            word: 'Clean fix, and thanks for the test. More like this welcome.',
          }),
      },
      {
        id: 'helped-sent',
        title: 'This PR helped: sent',
        path: '/contribute/maintainers/report?from=6650a1b2c3d4e5f6a7b8c9d0&kind=helped',
        height: 900,
        render: () => sentPage('helped'),
      },
      {
        id: 'helped-phone',
        title: 'This PR helped, on a phone',
        path: '/contribute/maintainers/report?from=6650a1b2c3d4e5f6a7b8c9d0&kind=helped',
        width: 390,
        height: 1500,
        render: () => reportPage(found(), 'helped', { likes: ['SOLVED_WELL'] }),
      },
    ],
  },
  {
    id: 'contribute-pr-timeline',
    title: 'Pull request timeline',
    area: 'contribute',
    route: '/contribute/pr/[owner]/[repo]/[number]',
    sources: [
      'app/(pr-timeline)/contribute/pr/[owner]/[repo]/[number]/page.tsx',
      'components/workspace/fix-page/made-page.tsx',
      'components/workspace/fix-page/how-it-was-made.tsx',
      'lib/workspace/pr-timeline-made.ts',
    ],
    states: [
      {
        id: 'merged',
        title: 'Merged after one review round',
        path: PR_TIMELINE_PATH,
        signedOut: true,
        height: 1500,
        render: () => prTimelinePage(mergedTimeline),
      },
      {
        id: 'closed',
        title: 'Closed by a maintainer',
        path: PR_TIMELINE_PATH,
        signedOut: true,
        height: 1250,
        render: () => prTimelinePage(closedTimeline),
      },
      {
        id: 'stopped',
        title: 'A maintainer stopped GitRanks work',
        path: PR_TIMELINE_PATH,
        signedOut: true,
        height: 1250,
        render: () => prTimelinePage(stoppedTimeline),
      },
      {
        id: 'own-agent',
        title: 'The contributor’s own agent',
        path: PR_TIMELINE_PATH,
        signedOut: true,
        height: 1150,
        render: () => prTimelinePage(ownAgentTimeline),
      },
      {
        id: 'autopilot',
        title: 'Autopilot, some checks failed',
        path: PR_TIMELINE_PATH,
        signedOut: true,
        height: 1200,
        render: () => prTimelinePage(autopilotTimeline),
      },
      {
        id: 'phone',
        title: 'Merged · phone',
        path: PR_TIMELINE_PATH,
        signedOut: true,
        width: 390,
        height: 3000,
        render: () => prTimelinePage(mergedTimeline),
      },
    ],
  },
  {
    id: 'contribute-ledger',
    title: 'Contribute ledger',
    area: 'contribute',
    route: '/contribute/ledger',
    sources: ['app/(public)/contribute/ledger/page.tsx', 'app/contribute/components/ledger-view.tsx'],
    states: [
      {
        id: 'preview',
        title: 'Preview: only the list sees it, the bar on top',
        path: '/contribute/ledger',
        height: 2400,
        render: () => ledgerPage(ledger),
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
  {
    id: 'contribute-mcp',
    title: 'MCP server docs',
    area: 'contribute',
    route: '/contribute/mcp',
    sources: [
      'app/(public)/contribute/mcp/page.tsx',
      'app/contribute/components/mcp-docs.tsx',
      'app/contribute/components/public-pages.tsx',
      'lib/contribute/mcp-docs.ts',
    ],
    states: [
      {
        id: 'signed-out',
        title: 'Signed out',
        path: '/contribute/mcp',
        signedOut: true,
        height: 6000,
        render: () => publicPage(<McpDocsScreen />),
      },
    ],
  },
  {
    id: 'contribute-faq',
    title: 'Questions',
    area: 'contribute',
    route: '/contribute/faq',
    sources: [
      'app/(public)/contribute/faq/page.tsx',
      'app/contribute/components/faq.tsx',
      'app/contribute/components/public-pages.tsx',
      'lib/contribute/faq.ts',
    ],
    states: [
      {
        id: 'signed-out',
        title: 'Signed out',
        path: '/contribute/faq',
        signedOut: true,
        height: 2850,
        render: () => publicPage(<FaqScreen />),
      },
    ],
  },
  {
    id: 'contribute-terms',
    title: 'Terms, with the Contribute section',
    area: 'contribute',
    route: '/terms',
    sources: ['app/terms/page.tsx', 'components/legal/legal-page.tsx'],
    states: [
      {
        id: 'launched',
        title: "Once Contribute is open: its section and Learn's",
        path: '/terms',
        signedOut: true,
        height: 5600,
        render: () => <TermsScreen contribute />,
      },
    ],
  },
];
