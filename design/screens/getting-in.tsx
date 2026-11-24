import Link from 'next/link';
import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import {
  AGENT_HEAD,
  BACK_TO_CHOICE,
  CHOICE_SIGN_IN,
  FIRST_ISSUE,
  OWN_AGENT_HEAD,
  WORK_HEAD,
} from '@/app/(onboarding)/contribute/start/copy';
import { ApplyLearnGoal, GoalSaveFailed } from '@/app/(onboarding)/learn/start/components/apply-goal';
import { accountGoalLineOf, SignedIn, VisitorSignIn } from '@/app/(onboarding)/learn/start/components/issue-step';
import { IssueStepBody } from '@/app/(onboarding)/learn/start/components/issue-step-body';
import { Issues, IssuesHead } from '@/app/(onboarding)/learn/start/components/issues-step';
import { SeeAllIssues } from '@/app/(onboarding)/learn/start/components/see-all';
import {
  BACK_LABEL,
  GOAL_VISITOR_NOTE,
  PRACTICE_TEXT,
  PRACTICE_TITLE,
  STARTING_ASKS,
  writtenForOf,
} from '@/app/(onboarding)/learn/start/copy';
import { ContributeIssueList } from '@/app/(workspace)/contribute/components/issue-list';
import { LearnIssueList } from '@/app/(workspace)/learn/components/issue-list';
import { LearnGoalQuick } from '@/app/learn/components/learn-goal-quick';
import { PracticeSection } from '@/app/learn/components/practice-lessons';
import { AgentChoice } from '@/components/contribute/start/agent-choice';
import { PicksNotSaved } from '@/components/contribute/start/apply-picks';
import { OwnAgentStep } from '@/components/contribute/start/own-agent-step';
import { WorkStep } from '@/components/contribute/start/work-step';
import { Header } from '@/components/header/header';
import { LearnNoneReady } from '@/components/learn/learn-issue-notes';
import { ConnectScreen } from '@/components/workspace/agent/connect-view';
import { ChangesProvider } from '@/components/workspace/changes-provider';
import { FlowBack, FlowFrame, FlowHead } from '@/components/workspace/getting-in/flow-frame';
import { FlowSignIn } from '@/components/workspace/getting-in/flow-sign-in';
import type { FlowStepNumber } from '@/components/workspace/getting-in/flow-steps';
import { HEADING } from '@/components/workspace/primitives';
import { ContributeSettingUp } from '@/components/workspace/setting-up';
import { issuePage } from '@/lib/contribute/__fixtures__/contribute-overview';
import { views } from '@/lib/contribute/__fixtures__/contribute-views';
import { firstIssueLineOf, type WorkPicks } from '@/lib/contribute/start-flow';
import { ISSUES, learnIssues, PRACTICE, practiceLessons } from '@/lib/learn/__fixtures__/home';
import { filledProfile } from '@/lib/learn/__fixtures__/profile';
import {
  goalViewOfPick,
  issueStepTargetOf,
  type LearnGoalPick,
  learnGoalLabelOfPick,
  learnIssuesOfPublic,
  withLearnGoal,
} from '@/lib/learn/start-flow';
import type { FlowSide } from '@/lib/workspace/getting-in';
import { GETTING_IN_PATHS, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { LEARN_START_PATH, START_REF, startPageViewOf } from '@/lib/workspace/start/__fixtures__/start-page';

/**
 * The two flows that start Contribute and Learn, as their pages draw them: the site header (its Contribute or Learn
 * marked by the path), no workspace tabs, the line of steps, then the step. The pages read their place on the server
 * (`loadContributeFlowPlace`, `loadLearnFlowPlace`); here each state is the step's own parts with fixtures.
 */
const flow = (side: FlowSide, step: FlowStepNumber, children: ReactNode) => (
  <>
    <Header />
    <FlowFrame side={side} step={step}>
      {children}
    </FlowFrame>
  </>
);

const NO_PICKS: WorkPicks = { languages: [], kinds: [] };
/** A signed-in person's languages, pre-ticked from their profile's top three. */
const PROFILE_PICKS: WorkPicks = { languages: ['JS_TS', 'GO', 'RUST'], kinds: [] };
const noop = () => {};

/**
 * Step 2's choice, as `/contribute/start/agent` draws it: the sign-in card above the dimmed cards for a visitor; signed
 * in, the line that the picks of step 1 could not be saved when `unsaved`.
 */
const agentChoice = (visitor: boolean, unsaved = false) =>
  flow(
    'contribute',
    2,
    <>
      <FlowHead {...AGENT_HEAD} />
      {visitor ? <FlowSignIn {...CHOICE_SIGN_IN} source="contribute_flow_sign_in" /> : null}
      {unsaved ? <PicksNotSaved pending={false} onRetry={noop} /> : null}
      <AgentChoice enabled={!visitor} />
    </>,
  );

/** Step 3, as `/contribute/start/issue` draws it for a person whose own agent has connected. */
const firstIssue = (page = issuePage) =>
  flow(
    'contribute',
    3,
    <>
      <FlowHead title={FIRST_ISSUE.title} text={firstIssueLineOf({ hosted: false, own: true }, 'Claude Code')} />
      <ContributeIssueList
        page={page}
        agents={{ hosted: false, own: true }}
        menu={false}
        languages={['JS_TS']}
        facts={{ capUsd: null, keyWaiting: null }}
        source="contribute_flow_issue"
        noneTitle={FIRST_ISSUE.none}
      />
      <p className="text-sm text-muted-foreground">{FIRST_ISSUE.review}</p>
      <Link
        href={WORKSPACE_PATHS.contribute}
        prefetch={false}
        className="self-start text-sm font-semibold text-link hover:underline max-sm:min-h-11"
      >
        {FIRST_ISSUE.skip}
      </Link>
    </>,
  );

export const CONTRIBUTE_FLOW_SCREENS: Screen[] = [
  {
    id: 'contribute-flow-work',
    title: 'Getting in · What you work on',
    area: 'contribute',
    route: '/contribute/start',
    sources: [
      'app/(onboarding)/layout.tsx',
      'app/(onboarding)/contribute/start/page.tsx',
      'components/workspace/getting-in/flow-frame.tsx',
      'components/workspace/getting-in/flow-steps.tsx',
      'components/workspace/getting-in/flow-place.tsx',
      'components/contribute/start/work-step.tsx',
      'lib/contribute/start-flow.ts',
      'lib/workspace/getting-in.ts',
    ],
    states: [
      {
        id: 'visitor',
        title: 'A visitor: nothing ticked, and the sign-in that fills languages from their repositories',
        path: GETTING_IN_PATHS.contributeWork,
        signedOut: true,
        height: 920,
        render: () =>
          flow(
            'contribute',
            1,
            <>
              <FlowHead {...WORK_HEAD} />
              <WorkStep initial={NO_PICKS} signedIn={false} />
            </>,
          ),
      },
      {
        id: 'signed-in',
        title: 'Signed in, nothing saved yet: languages pre-ticked from their profile',
        path: GETTING_IN_PATHS.contributeWork,
        height: 880,
        render: () =>
          flow(
            'contribute',
            1,
            <>
              <FlowHead {...WORK_HEAD} />
              <WorkStep initial={PROFILE_PICKS} signedIn />
            </>,
          ),
      },
      {
        id: 'setting-up',
        title: 'A new account still being set up: the panel in the frame, on every step',
        path: GETTING_IN_PATHS.contributeWork,
        height: 480,
        render: () => flow('contribute', 1, <ContributeSettingUp />),
      },
    ],
  },
  {
    id: 'contribute-flow-agent',
    title: 'Getting in · Your agent',
    area: 'contribute',
    route: '/contribute/start/agent',
    sources: [
      'app/(onboarding)/contribute/start/agent/page.tsx',
      'app/(onboarding)/contribute/start/sign-in-copy.ts',
      'components/contribute/start/agent-choice.tsx',
      'components/contribute/start/apply-picks.tsx',
      'components/workspace/getting-in/flow-sign-in.tsx',
    ],
    states: [
      {
        id: 'visitor',
        title: 'A visitor: sign in first, the two ways dimmed until then',
        path: GETTING_IN_PATHS.contributeAgent,
        signedOut: true,
        height: 880,
        render: () => agentChoice(true),
      },
      {
        id: 'picks-unsaved',
        title: 'Signed in, the picks of step 1 not saved: one quiet line with Try again; the cards still work',
        path: `${GETTING_IN_PATHS.contributeAgent}?languages=rust,go`,
        height: 760,
        render: () => agentChoice(false, true),
      },
      {
        id: 'phone',
        title: 'A visitor on a phone: the sign-in card, then the two ways stacked',
        path: GETTING_IN_PATHS.contributeAgent,
        signedOut: true,
        width: 390,
        height: 1340,
        render: () => agentChoice(true),
      },
    ],
  },
  {
    id: 'contribute-flow-agent-own',
    title: 'Getting in · Connect your own agent',
    area: 'contribute',
    route: '/contribute/start/agent/own',
    sources: [
      'app/(onboarding)/contribute/start/agent/own/page.tsx',
      'components/contribute/start/own-agent-step.tsx',
      'components/workspace/agent/agent-connect.tsx',
    ],
    states: [
      {
        id: 'signed-in',
        title: 'Signed in: the connect steps embedded, then on to the first issue',
        path: GETTING_IN_PATHS.contributeAgentOwn,
        height: 700,
        render: () =>
          flow(
            'contribute',
            2,
            <>
              <div className="flex flex-col gap-2">
                <FlowBack href={GETTING_IN_PATHS.contributeAgent}>{BACK_TO_CHOICE}</FlowBack>
                <span className="text-xs font-semibold text-primary">{OWN_AGENT_HEAD.eyebrow}</span>
                <h1 className={HEADING.page}>{OWN_AGENT_HEAD.title}</h1>
              </div>
              <OwnAgentStep tokens={[]} signIn={false} openedAt="2026-10-28T12:00:00.000Z" />
            </>,
          ),
      },
    ],
  },
  {
    id: 'contribute-flow-agent-key',
    title: 'Getting in · Connect your Claude key',
    area: 'contribute',
    route: '/contribute/start/agent/key',
    sources: [
      'app/(onboarding)/contribute/start/agent/key/page.tsx',
      'components/workspace/agent/connect-view.tsx',
      'components/workspace/agent/key-connect.tsx',
      'components/workspace/matching.tsx',
    ],
    states: [
      {
        id: 'signed-in',
        title: 'Signed in: the key, its limits and its reset day; your own agent instead',
        path: GETTING_IN_PATHS.contributeAgentKey,
        height: 1920,
        render: () =>
          flow(
            'contribute',
            2,
            <>
              <FlowBack href={GETTING_IN_PATHS.contributeAgent}>{BACK_TO_CHOICE}</FlowBack>
              <ConnectScreen
                view={views.noKey}
                today={28}
                profileLanguages={['TypeScript', 'Go']}
                ownAgentHref={GETTING_IN_PATHS.contributeAgentOwn}
                eyebrow="About two minutes"
              />
            </>,
          ),
      },
    ],
  },
  {
    id: 'contribute-flow-issue',
    title: 'Getting in · Your first issue',
    area: 'contribute',
    route: '/contribute/start/issue',
    sources: [
      'app/(onboarding)/contribute/start/issue/page.tsx',
      'app/(workspace)/contribute/components/issue-list.tsx',
      'components/workspace/getting-in/flow-bookmark.tsx',
      'lib/contribute/start-flow.ts',
    ],
    states: [
      {
        id: 'list',
        title: 'Your own agent connected: Start on one, or skip for now',
        path: GETTING_IN_PATHS.contributeIssue,
        height: 900,
        render: () => firstIssue(),
      },
      {
        id: 'none',
        title: 'No issue matches what you work on yet: change it in Settings',
        path: GETTING_IN_PATHS.contributeIssue,
        height: 580,
        render: () => firstIssue({ items: [], next: null, total: 0, computedAt: '2026-10-28T06:00:00.000Z' }),
      },
    ],
  },
];

/** The goal a visitor brought from Your goal: TypeScript, level Some. */
const GOAL: LearnGoalPick = { language: 'TypeScript', level: 1 };
const CHANGE = withLearnGoal(GETTING_IN_PATHS.learnGoal, GOAL);
/** The day's short list a visitor reads for the language: rows without their node id. */
const PUBLIC_ISSUES = {
  language: 'TypeScript',
  items: ISSUES.map(({ issueId: _id, ...issue }) => issue),
  total: 38,
};
/** The language's public practice lessons, as the kept answer holds them. */
const PUBLIC_PRACTICE = {
  items: Array.from({ length: 6 }, (_, index) => ({ ...PRACTICE[index % PRACTICE.length], slug: `practice-${index}` })),
  total: 7,
};

/** Your goal, as `/learn/start` draws it. */
const goalStep = (visitor: boolean) =>
  flow(
    'learn',
    1,
    <>
      <LearnGoalQuick profile={visitor ? null : filledProfile} flow={{ initial: null, draft: visitor }} />
      {visitor ? <p className="text-sm text-muted-foreground">{GOAL_VISITOR_NOTE}</p> : null}
    </>,
  );

/** A visitor's Pick an issue for TypeScript: the day's list (or none ready), then the public practice lessons. */
const visitorIssues = (ready = true) => {
  const view = goalViewOfPick(GOAL);
  return flow(
    'learn',
    2,
    <>
      <IssuesHead goal={view} changeHref={CHANGE} />
      <Issues who="visitor">
        {ready ? (
          <>
            <p className="text-sm text-muted-foreground sm:self-end">{STARTING_ASKS}</p>
            <LearnIssueList
              issues={learnIssuesOfPublic(PUBLIC_ISSUES, view)}
              start={issueStepTargetOf(GOAL)}
              more={false}
              source="learn_flow_issue"
              changeHref={CHANGE}
            />
            <SeeAllIssues shown={PUBLIC_ISSUES.items.length} total={PUBLIC_ISSUES.total} />
          </>
        ) : (
          <LearnNoneReady language={GOAL.language} changeHref={CHANGE} />
        )}
      </Issues>
      <PracticeSection
        practice={PUBLIC_PRACTICE}
        goal={GOAL.language}
        title={PRACTICE_TITLE}
        text={PRACTICE_TEXT}
        source="learn_flow_practice"
        visitor
      />
    </>,
  );
};

/** Your agent for a visitor, at the issue's own start address: sign in first, the steps after it dimmed. */
const visitorIssueStep = (listed: boolean) => {
  const goalLine = writtenForOf(learnGoalLabelOfPick(GOAL));
  const back = withLearnGoal(GETTING_IN_PATHS.learnIssues, GOAL);
  const [first] = PUBLIC_ISSUES.items;
  return flow(
    'learn',
    3,
    <>
      <FlowBack href={back}>{BACK_LABEL}</FlowBack>
      <IssueStepBody
        issueRef={START_REF}
        view={null}
        card={listed ? { repo: first.repo, title: first.title, goalLine } : { goalLine }}
        locked
        firstSection={<VisitorSignIn goal={GOAL} />}
        backHref={back}
        backLabel={BACK_LABEL}
      />
    </>,
  );
};

/**
 * Your agent for a signed-in person with a goal saved (TypeScript, Some), the agent connected: section 1 done, the
 * prompt to paste. `goal` is a goal the address still carries.
 */
const accountIssueStep = (goal: LearnGoalPick | null) =>
  flow(
    'learn',
    3,
    <>
      <FlowBack href={GETTING_IN_PATHS.learnIssues}>{BACK_LABEL}</FlowBack>
      {/* The poll the page holds itself (`WorkspaceLive`), with nothing read yet. */}
      <ChangesProvider version={null} activity={null} needsYou={null} standby>
        <IssueStepBody
          issueRef={START_REF}
          view={startPageViewOf()}
          card={{ goalLine: accountGoalLineOf(goal, filledProfile) }}
          firstSection={<SignedIn login="octocat" />}
          backHref={GETTING_IN_PATHS.learnIssues}
          backLabel={BACK_LABEL}
        />
      </ChangesProvider>
    </>,
  );

/** Pick an issue back from the sign-in with no goal saved yet: the goal in the address saved in the list's place. */
const savingIssues = (failed: boolean) =>
  flow(
    'learn',
    2,
    <>
      <IssuesHead goal={goalViewOfPick(GOAL)} changeHref={CHANGE} />
      <Issues who="account">
        {failed ? (
          <GoalSaveFailed pending={false} onRetry={noop} />
        ) : (
          <ApplyLearnGoal goal={GOAL} profile={null} saved={false} />
        )}
      </Issues>
    </>,
  );

const LEARN_ISSUE_PATH = `${LEARN_START_PATH}?language=TypeScript&level=1`;

export const LEARN_FLOW_SCREENS: Screen[] = [
  {
    id: 'learn-flow-goal',
    title: 'Getting in · Your goal',
    area: 'learn',
    route: '/learn/start',
    sources: [
      'app/(onboarding)/learn/start/page.tsx',
      'app/learn/components/learn-goal-quick.tsx',
      'lib/learn/start-flow.ts',
      'lib/learn/start-flow.data.ts',
    ],
    states: [
      {
        id: 'visitor',
        title: 'A visitor: pick a language and a level; nothing is saved yet',
        path: GETTING_IN_PATHS.learnGoal,
        signedOut: true,
        height: 580,
        render: () => goalStep(true),
      },
      {
        id: 'signed-in',
        title: 'Signed in: saved on Show issues, and More choices in Settings',
        path: GETTING_IN_PATHS.learnGoal,
        height: 560,
        render: () => goalStep(false),
      },
    ],
  },
  {
    id: 'learn-flow-issues',
    title: 'Getting in · Pick an issue',
    area: 'learn',
    route: '/learn/start/issues',
    sources: [
      'app/(onboarding)/learn/start/issues/page.tsx',
      'app/(onboarding)/learn/start/components/issues-step.tsx',
      'app/(onboarding)/learn/start/components/see-all.tsx',
      'app/(onboarding)/learn/start/components/apply-goal.tsx',
      'app/(workspace)/learn/components/issue-list.tsx',
      'app/learn/components/practice-lessons.tsx',
      'components/learn/goal-chips.tsx',
    ],
    states: [
      {
        id: 'visitor',
        title: 'A visitor: the day’s short list, Sign in with GitHub to see all, then practice lessons',
        path: `${GETTING_IN_PATHS.learnIssues}?language=TypeScript&level=1`,
        signedOut: true,
        height: 1880,
        render: () => visitorIssues(),
      },
      {
        id: 'visitor-none',
        title: 'A visitor, no issue ready today for the language',
        path: `${GETTING_IN_PATHS.learnIssues}?language=TypeScript&level=1`,
        signedOut: true,
        height: 1460,
        render: () => visitorIssues(false),
      },
      {
        id: 'saving',
        title: 'Back from Sign in with GitHub to see all, no goal saved yet: the address’s goal saved first',
        path: `${GETTING_IN_PATHS.learnIssues}?language=TypeScript&level=1`,
        height: 460,
        render: () => savingIssues(false),
      },
      {
        id: 'save-failed',
        title: 'The goal could not be saved: Try again',
        path: `${GETTING_IN_PATHS.learnIssues}?language=TypeScript&level=1`,
        height: 500,
        render: () => savingIssues(true),
      },
      {
        id: 'signed-in',
        title: 'Signed in, a goal saved: their own list (10, then Show 10 more) and practice they haven’t passed',
        path: GETTING_IN_PATHS.learnIssues,
        height: 1820,
        render: () => {
          const issues = learnIssues();
          return flow(
            'learn',
            2,
            <>
              <IssuesHead goal={issues.goal} changeHref={GETTING_IN_PATHS.learnGoal} />
              <Issues who="account">
                <LearnIssueList
                  issues={issues}
                  start={issueStepTargetOf(null)}
                  source="learn_flow_issue"
                  changeHref={GETTING_IN_PATHS.learnGoal}
                />
              </Issues>
              <PracticeSection
                practice={practiceLessons()}
                goal="TypeScript"
                title={PRACTICE_TITLE}
                text={PRACTICE_TEXT}
                source="learn_flow_practice"
              />
            </>,
          );
        },
      },
      {
        id: 'phone',
        title: 'A visitor on a phone',
        path: `${GETTING_IN_PATHS.learnIssues}?language=TypeScript&level=1`,
        signedOut: true,
        width: 390,
        height: 2840,
        render: () => visitorIssues(),
      },
    ],
  },
  {
    id: 'learn-flow-issue',
    title: 'Getting in · Your agent',
    area: 'learn',
    route: '/learn/start/[owner]/[repo]/[issue]',
    sources: [
      'app/(onboarding)/learn/start/[owner]/[repo]/[issue]/page.tsx',
      'app/(onboarding)/learn/start/components/issue-step.tsx',
      'app/(onboarding)/learn/start/components/issue-step-body.tsx',
      'components/workspace/start/start-page-body.tsx',
      'components/workspace/start/start-page-screen.tsx',
    ],
    states: [
      {
        id: 'visitor',
        title: 'A visitor, an issue from the day’s list: sign in first, the agent and the prompt dimmed',
        path: LEARN_ISSUE_PATH,
        signedOut: true,
        height: 1120,
        render: () => visitorIssueStep(true),
      },
      {
        id: 'visitor-unlisted',
        title: 'A visitor, an issue not on the day’s list: no repo and no title, only its Issue chip',
        path: LEARN_ISSUE_PATH,
        signedOut: true,
        height: 1100,
        render: () => visitorIssueStep(false),
      },
      {
        id: 'connected',
        title: 'Signed in, the agent connected: section 1 done, the prompt to paste',
        path: LEARN_START_PATH,
        height: 1420,
        render: () => accountIssueStep(null),
      },
      {
        id: 'other-goal',
        title: 'Signed in with another goal saved than the address carries: the saved one is used, with Change',
        path: `${LEARN_START_PATH}?language=Python&level=0`,
        height: 1420,
        render: () => accountIssueStep({ language: 'Python', level: 0 }),
      },
    ],
  },
];
