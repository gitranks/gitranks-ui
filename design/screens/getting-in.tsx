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
import { ContributeIssueList } from '@/app/(workspace)/contribute/components/issue-list';
import { AgentChoice } from '@/components/contribute/start/agent-choice';
import { PicksNotSaved } from '@/components/contribute/start/apply-picks';
import { OwnAgentStep } from '@/components/contribute/start/own-agent-step';
import { WorkStep } from '@/components/contribute/start/work-step';
import { Header } from '@/components/header/header';
import { ConnectScreen } from '@/components/workspace/agent/connect-view';
import { FlowBack, FlowFrame, FlowHead } from '@/components/workspace/getting-in/flow-frame';
import { FlowSignIn } from '@/components/workspace/getting-in/flow-sign-in';
import type { FlowStepNumber } from '@/components/workspace/getting-in/flow-steps';
import { HEADING } from '@/components/workspace/primitives';
import { ContributeSettingUp } from '@/components/workspace/setting-up';
import { issuePage } from '@/lib/contribute/__fixtures__/contribute-overview';
import { views } from '@/lib/contribute/__fixtures__/contribute-views';
import { firstIssueLineOf, type WorkPicks } from '@/lib/contribute/start-flow';
import type { FlowSide } from '@/lib/workspace/getting-in';
import { GETTING_IN_PATHS, WORKSPACE_PATHS } from '@/lib/workspace/paths';

/**
 * The flow that starts Contribute, as its pages draw it: the site header (its Contribute marked by the path), no
 * workspace tabs, the line of steps, then the step. The pages read their place on the server
 * (`loadContributeFlowPlace`); here each state is the step's own parts with fixtures.
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
