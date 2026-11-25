import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { CONTRIBUTE_HOME_BOX_SCREENS } from './contribute-wave-4-parts';
import { CONTRIBUTE_FLOW_SCREENS } from './getting-in';
import { type ContributeTabData, ContributeTabScreen } from '@/app/(workspace)/contribute/components/contribute-tab';
import { FairUseAnswerScreen } from '@/app/(workspace)/contribute/components/fair-use-answer';
import { ContributeBadgePreview } from '@/app/contribute/components/contribute-badge-preview';
import { FaqScreen } from '@/app/contribute/components/faq';
import { Landing } from '@/app/contribute/components/landing';
import { LandingHead } from '@/app/contribute/components/landing-parts/head';
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
import { activityOf, runOf } from '@/lib/contribute/__fixtures__/agent-runs';
import { issue } from '@/lib/contribute/__fixtures__/contribute-overview';
import { mcpToken, NOW, views } from '@/lib/contribute/__fixtures__/contribute-views';
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
import { maintainerConfig, maintainerRules } from '@/lib/contribute/__fixtures__/repo-rules';
import {
  agentRead,
  homeRead,
  mergedRead,
  NEWEST_MERGED,
  needsYouRow,
  proofMerged,
  proofOpenOnly,
} from '@/lib/contribute/__fixtures__/wave-4-parts';
import type { AgentPageStats } from '@/lib/contribute/agent-page.types';
import { landingProofOf } from '@/lib/contribute/landing-proof';
import type { MaintainerReposView } from '@/lib/contribute/maintainers.data';
import type { PrReportRead } from '@/lib/contribute/pr-feedback.data';
import { issueNumbers, looksToday, maskedIssues } from '@/lib/workspace/__fixtures__/masked-issue';
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

/** A key and a live token the agent has called with: both ways connected. */
const both: ContributeView = {
  ...views.active,
  ownAgent: { paths: { hosted: true, mcp: true }, tokens: [mcpToken({ lastUsedAt: '2026-10-28T09:00:00.000Z' })] },
};

/** The issues for the person as the list shows them now: masked rows, and one of a project they named. */
const masked = (id: string, at: number) => {
  const shown = maskedIssues[at % maskedIssues.length];
  return issue({ issueId: `mask:${id}`, number: at + 100, rank: at + 1, masked: { ...shown, id } });
};
const homeIssues: ContributeIssuePage = {
  items: [
    masked('q7k2m9xa', 0),
    masked('r3n8p1vd', 1),
    issue({ issueId: 'I_named', rank: 3, title: 'A span that ends at the end of the file panics' }),
    masked('t5w0c4hy', 2),
    masked('u8b2k6zr', 1),
  ],
  next: null,
  total: 5,
  computedAt: '2026-10-28T11:00:00.000Z',
};
const LOOKS = { looks: looksToday({ limit: 30, left: 27, base: 25, merged: 1 }), numbers: issueNumbers };

/** The person's own agent at work on one issue. */
const ownRun = runOf({
  attemptId: 'att_own',
  runner: 'MCP',
  spendUsd: null,
  budgetUsd: null,
  nameWithOwner: 'quill-rs/quill',
  number: 1204,
  title: 'Panic when the config file is empty',
  label: 'Working',
});

/** Contribute home as its page reads it: both ways connected, the issues for the person, nothing paused. */
const home = (patch: Partial<ContributeTabData> = {}, activity: ContributeActivity = activityOf()) =>
  frame(
    <ContributeTabScreen
      view={both}
      agents={{ hosted: true, own: true }}
      home={homeRead({ agent: agentRead({ key: true, runs: activity.runs }) })}
      activity={activity}
      page={homeIssues}
      counts={{ prBound: 1 }}
      masked={LOOKS}
      now={NOW}
      {...patch}
    />,
    activity,
  );

/** A day: a pull request needs the person, their agent is at work, seven merged. */
const DAY = homeRead({
  needsYou: [needsYouRow(), needsYouRow({ since: '2026-11-25T09:00:00Z', issueNumber: 9 })],
  agent: agentRead({ key: true, runs: [ownRun] }),
  merged: mergedRead({ merged: 7, reposHelped: 6, newest: NEWEST_MERGED }),
});
const DAY_ACTIVITY = activityOf(ownRun);

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

/** The landing's button for a visitor: the flow's first step. */
const VISITOR = { href: GETTING_IN_PATHS.contributeWork, signedIn: false };
const LANDING_STATS: AgentPageStats = {
  readyIssues: 2792,
  repos: 1291,
  languages: [],
  checkedAt: '2026-10-28T12:05:00Z',
};
/** The landing's live reads, as on a day with three merged pull requests that have a public page. */
const LANDING_LIVE = { stats: LANDING_STATS, proof: landingProofOf(proofMerged), ledgerOpen: true };
/** The top of the landing when there is less to show: what the newest pull requests read gives. */
const LESS_TO_SHOW = [
  { title: 'One or two merged: the card, and no "Merged through GitRanks"', read: proofMerged.slice(0, 2) },
  { title: 'None merged yet: the newest open one', read: proofOpenOnly },
  { title: 'None at all, or the read failed: the words take the full width', read: [] },
];

export const CONTRIBUTE_SCREENS: Screen[] = [
  {
    id: 'contribute-landing',
    title: 'Landing',
    area: 'contribute',
    route: '/contribute',
    sources: [
      'app/contribute/components/landing.tsx',
      'app/contribute/components/landing-parts/head.tsx',
      'app/contribute/components/landing-parts/proof-card.tsx',
      'app/contribute/components/landing-parts/proof-rows.tsx',
      'app/contribute/components/landing-parts/ways.tsx',
      'app/contribute/components/landing-parts/way-box.tsx',
      'app/contribute/components/landing-parts/steps.tsx',
      'app/contribute/components/landing-parts/defaults.tsx',
      'app/contribute/components/landing-parts/pr-footer.tsx',
      'app/contribute/components/landing-parts/questions.tsx',
      'app/contribute/components/landing-parts/foot.tsx',
      'app/contribute/components/landing-parts/start-button.tsx',
      'app/contribute/components/landing-view.tsx',
      'app/(public)/contribute/about/page.tsx',
      'components/workspace/getting-in/landing-band.tsx',
      'components/workspace/getting-in/resume-link.tsx',
      'components/workspace/agent/coming-soon.tsx',
      'components/workspace/sign-in-dialog.tsx',
      'lib/contribute/landing-copy.ts',
      'lib/contribute/landing-proof.ts',
      'lib/contribute/faq.ts',
    ],
    states: [
      {
        id: 'visitor',
        title: 'Signed out: the newest merged pull request at the top, three merged through GitRanks',
        path: '/contribute',
        signedOut: true,
        height: 5200,
        // As the layout frames it for a visitor: the header's line, no tabs.
        render: () => publicPage(<Landing viewer="visitor" start={VISITOR} noted={[]} {...LANDING_LIVE} />),
      },
      {
        id: 'phone',
        title: 'Signed out, on a phone: the parts stacked, the top card after the button',
        path: '/contribute',
        signedOut: true,
        width: 390,
        height: 9800,
        render: () => publicPage(<Landing viewer="visitor" start={VISITOR} noted={[]} {...LANDING_LIVE} />),
      },
      {
        id: 'about',
        title:
          'How Contribute works, for a member: the same page, Go to your issues; the public ledger closed, so "Merged through GitRanks" stands alone',
        path: '/contribute/about',
        height: 5200,
        render: () =>
          publicPage(
            <Landing viewer="signed-in" start={{ member: true }} noted={[]} {...LANDING_LIVE} ledgerOpen={false} />,
          ),
      },
      {
        id: 'less',
        title: 'Less to show: one or two merged (no rows), only an open one, none at all',
        path: '/contribute',
        signedOut: true,
        height: 2000,
        // The head of each case; below it the page goes on as for a visitor, without "Merged through GitRanks".
        render: () => (
          <>
            {LESS_TO_SHOW.map(({ title, read }) => (
              <div key={title} className="border-b">
                <p className="mx-auto max-w-7xl px-4 pt-4 text-sm font-semibold text-muted-foreground">{title}</p>
                <LandingHead start={VISITOR} stats={LANDING_STATS} card={landingProofOf(read).card} />
              </div>
            ))}
          </>
        ),
      },
    ],
  },
  ...CONTRIBUTE_FLOW_SCREENS,
  {
    id: 'contribute-home',
    title: 'Contribute home',
    area: 'contribute',
    route: '/contribute',
    sources: [
      'app/(workspace)/contribute/page.tsx',
      'app/(workspace)/contribute/components/contribute-tab.tsx',
      'app/(workspace)/contribute/components/contribute-tab-view.tsx',
      'app/(workspace)/contribute/components/home-boxes.tsx',
      'app/(workspace)/contribute/components/issue-list.tsx',
      'components/workspace/home-box.tsx',
      'components/workspace/masked-issue/masked-list.tsx',
      'lib/contribute/home-boxes.ts',
      'lib/contribute/home-read.ts',
    ],
    states: [
      {
        id: 'day',
        title: 'A day: a pull request needs you (lit), your agent at work, merged; the issues for you',
        path: '/contribute',
        height: 1600,
        render: () => home({ home: DAY }, DAY_ACTIVITY),
      },
      {
        id: 'first-day',
        title: 'The first day: the three boxes say what will happen, the first one lit',
        path: '/contribute',
        height: 1600,
        render: () => home({ home: homeRead({ firstDay: true, agent: agentRead({ key: true }) }) }),
      },
      {
        id: 'first-picks',
        title: 'The first issues are being picked',
        path: '/contribute',
        height: 1000,
        render: () =>
          home({
            home: homeRead({ firstDay: true, agent: agentRead({ key: true }) }),
            page: { items: [], next: null, total: 0, computedAt: null },
          }),
      },
      {
        id: 'nothing-fits',
        title: 'No open issue fits what you work on',
        path: '/contribute',
        height: 1000,
        render: () => home({ page: { items: [], next: null, total: 0, computedAt: '2026-10-28T11:00:00.000Z' } }),
      },
      {
        id: 'used',
        title: "The day's full issues are used: no short line, each row says when more come",
        path: '/contribute',
        height: 1500,
        render: () => home({ masked: { ...LOOKS, looks: looksToday({ limit: 30, left: 0, base: 25, merged: 1 }) } }),
      },
      {
        id: 'limit',
        title: 'Too many pull requests wait: the notice between the lines and the list',
        path: '/contribute',
        height: 1650,
        render: () => home({ counts: { prBound: 3 } }),
      },
      {
        id: 'held',
        title: 'The account is held: no issues, no Start',
        path: '/contribute',
        height: 1000,
        render: () => home({ view: views.suspended }),
      },
      {
        id: 'rules-banner',
        title: 'The Terms banner for people who connected an agent before the rule',
        path: '/contribute',
        height: 1750,
        render: () => home({ fairUse: fairUse({ rulesBanner }) }),
      },
      {
        id: 'fair-use-message',
        title: 'A message after a pull request opened outside GitRanks: Answer, the Terms, a close button',
        path: '/contribute',
        height: 1800,
        render: () => home({ fairUse: fairUse({ notices: [fairUseNotice()] }) }),
      },
      {
        id: 'fair-use-blocked',
        title: 'Blocked by a fair-use rule: the block’s message, which cannot be closed; no issues',
        path: '/contribute',
        height: 1100,
        render: () =>
          home({ view: fairUseBlocked, page: null, fairUse: fairUse({ notices: [blockNotice], block: blockNotice }) }),
      },
      {
        id: 'phone',
        title: 'A day, on a phone: the boxes one under the other',
        path: '/contribute',
        width: 390,
        height: 3000,
        render: () => home({ home: DAY }, DAY_ACTIVITY),
      },
    ],
  },
  ...CONTRIBUTE_HOME_BOX_SCREENS,
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
