import Link from 'next/link';
import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { BACK_TO_CHOICE, FIRST_ISSUE, OWN_AGENT_HEAD } from '@/app/(onboarding)/contribute/start/copy';
import { FirstIssueList } from '@/app/(onboarding)/contribute/start/first-issue-list';
import { StillRanking } from '@/app/contribute/components/still-ranking';
import { FirstIssueStep, type MarkState } from '@/components/contribute/start/first-issue-step';
import { OwnAgentStep } from '@/components/contribute/start/own-agent-step';
import { WhoDoesTheWork } from '@/components/contribute/start/who-does-the-work';
import { Header } from '@/components/header/header';
import { ConnectScreen } from '@/components/workspace/agent/connect-view';
import { FlowBack, FlowFrame } from '@/components/workspace/getting-in/flow-frame';
import { MaskedIssueRow } from '@/components/workspace/masked-issue/masked-issue-row';
import { HEADING } from '@/components/workspace/primitives';
import { ContributeNoProfile, ContributeSettingUp, ContributeSetupFailed } from '@/components/workspace/setting-up';
import { issuePage } from '@/lib/contribute/__fixtures__/contribute-overview';
import { views } from '@/lib/contribute/__fixtures__/contribute-views';
import { startRead } from '@/lib/contribute/__fixtures__/wave-4-parts';
import { type FirstIssueState, firstIssueLineOf } from '@/lib/contribute/start-flow';
import { type StartWaysRead, startWaysOf } from '@/lib/contribute/start-ways';
import { maskedIssue } from '@/lib/workspace/__fixtures__/masked-issue';
import type { ContributeIssuePage, ContributeLanguage } from '@/lib/workspace/contribute.types';
import type { FlowConnected } from '@/lib/workspace/getting-in';
import { issuePageHrefOf } from '@/lib/workspace/masked-issue';
import { GETTING_IN_PATHS, WORKSPACE_PATHS } from '@/lib/workspace/paths';

/**
 * The flow that starts Contribute, as its pages draw it: the site header (its Contribute marked by the path), no
 * workspace tabs, the line of two steps, then the step. The pages read their place on the server
 * (`loadContributeFlowPlace`); here each case is the step's own parts with fixtures.
 */

/** A labelled part of a board that shows several cases one under the other. */
const Case = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-3 border-t pt-4">
    <span className="text-sm font-semibold text-foreground">{title}</span>
    {children}
  </div>
);

const firstStep = (children: ReactNode) => (
  <>
    <Header />
    <FlowFrame side="contribute" step={1}>
      {children}
    </FlowFrame>
  </>
);

/** The first step in one case, as `/contribute/start` draws it. */
const ways = (read: Partial<StartWaysRead> = {}) => <WhoDoesTheWork ways={startWaysOf(startRead(read))} />;

const WAY_BACK = 'q7k2m9xa';
const OWN: FlowConnected = { own: true, hosted: false };
const PROFILE: ContributeLanguage[] = ['JS_TS', 'PYTHON', 'GO'];
const NONE: ContributeIssuePage = { items: [], next: null, total: 0, computedAt: '2026-10-28T06:00:00.000Z' };
const PICKING: ContributeIssuePage = { items: [], next: null, total: 0, computedAt: null };

/** The second step, as `/contribute/start/issue` draws it for a person whose own agent has connected. */
function firstIssue({
  state = 'list',
  page = issuePage,
  opened = false,
  saved = null,
  mark = 'done',
}: {
  state?: FirstIssueState;
  page?: ContributeIssuePage;
  opened?: boolean;
  saved?: ContributeLanguage[] | null;
  mark?: MarkState;
} = {}) {
  return (
    <>
      <Header />
      <FirstIssueStep
        mark={false}
        initialMark={mark}
        head={{ title: FIRST_ISSUE.title, text: firstIssueLineOf(OWN, 'Claude Code', state) }}
        languages={{ saved, profile: PROFILE, preferences: null }}
        nothingConnected={startWaysOf(startRead())}
        picking={<StillRanking reads={false} />}
        opened={
          opened ? (
            <section className="flex flex-col gap-3" data-opened-issue="">
              <h2 className="m-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {FIRST_ISSUE.opened}
              </h2>
              <MaskedIssueRow
                issue={maskedIssue({ id: WAY_BACK })}
                href={issuePageHrefOf(WAY_BACK, 'contribute')}
                seeLabel={FIRST_ISSUE.openedStart}
                skippable={false}
              />
              <h2 className="m-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {FIRST_ISSUE.another}
              </h2>
            </section>
          ) : null
        }
        foot={
          <>
            <p className="m-0 text-sm text-muted-foreground">{FIRST_ISSUE.next}</p>
            <Link
              href={WORKSPACE_PATHS.contribute}
              prefetch={false}
              data-flow-leave=""
              className="self-start text-sm font-semibold text-link hover:underline max-sm:min-h-11"
            >
              {FIRST_ISSUE.skip}
            </Link>
          </>
        }
      >
        {state === 'picking' ? (
          <StillRanking />
        ) : (
          <FirstIssueList
            none={state === 'none'}
            page={page}
            agents={OWN}
            menu={false}
            languages={saved ?? []}
            facts={{ capUsd: null, keyWaiting: null }}
            source="contribute_flow_issue"
          />
        )}
      </FirstIssueStep>
    </>
  );
}

export const CONTRIBUTE_FLOW_SCREENS: Screen[] = [
  {
    id: 'contribute-flow-start',
    title: 'Getting in · Your agent',
    area: 'contribute',
    route: '/contribute/start',
    sources: [
      'app/(onboarding)/layout.tsx',
      'app/(onboarding)/contribute/start/page.tsx',
      'app/(onboarding)/contribute/start/start-step.tsx',
      'components/contribute/start/who-does-the-work.tsx',
      'components/workspace/getting-in/flow-frame.tsx',
      'components/workspace/getting-in/flow-steps.tsx',
      'components/workspace/getting-in/flow-place.tsx',
      'lib/contribute/start-ways.ts',
      'lib/workspace/getting-in.ts',
      'lib/workspace/flow-way-back.ts',
      'lib/workspace/sign-in-to-flow.ts',
      'components/workspace/setting-up.tsx',
      'components/workspace/setup-retry.tsx',
      'components/workspace/no-profile-panel.tsx',
    ],
    states: [
      {
        id: 'signed-in',
        title: 'Signed in, nothing connected',
        path: GETTING_IN_PATHS.contributeStart,
        height: 1180,
        render: () => firstStep(ways()),
      },
      {
        id: 'visitor',
        title: 'A visitor: the same page, each button signing in with GitHub first',
        path: GETTING_IN_PATHS.contributeStart,
        signedOut: true,
        height: 1220,
        render: () => firstStep(ways({ signedIn: false })),
      },
      {
        id: 'from-issue',
        title: 'Opened from an issue that still reads: the line over the title, the way back on every button',
        path: `${GETTING_IN_PATHS.contributeStart}?issue=${WAY_BACK}`,
        height: 1220,
        render: () => firstStep(ways({ issue: WAY_BACK, issueReads: true })),
      },
      {
        id: 'no-sign',
        title: 'Connected, no Contribute sign: the step is done, Continue to the second',
        path: GETTING_IN_PATHS.contributeStart,
        height: 2900,
        render: () =>
          firstStep(
            <>
              <Case title="An agent of their own">{ways({ own: 'Claude Code' })}</Case>
              <Case title="A Claude key">{ways({ key: 'connected' })}</Case>
              <Case title="Both">{ways({ own: 'Claude Code', key: 'connected' })}</Case>
            </>,
          ),
      },
      {
        id: 'with-sign',
        title: 'Connected, with the Contribute sign: back to add the other way',
        path: GETTING_IN_PATHS.contributeStart,
        height: 2900,
        render: () =>
          firstStep(
            <>
              <Case title="An agent of their own">{ways({ sign: true, own: 'Claude Code' })}</Case>
              <Case title="A Claude key, with an attempt">{ways({ sign: true, key: 'connected', attempt: true })}</Case>
              <Case title="Both">{ways({ sign: true, own: 'Claude Code', key: 'connected' })}</Case>
            </>,
          ),
      },
      {
        id: 'key-invalid',
        title: 'The Claude key stopped working, nothing else connected',
        path: GETTING_IN_PATHS.contributeStart,
        height: 1180,
        render: () => firstStep(ways({ key: 'invalid' })),
      },
      {
        id: 'phone',
        title: 'A visitor on a phone',
        path: GETTING_IN_PATHS.contributeStart,
        signedOut: true,
        width: 390,
        height: 1900,
        render: () => firstStep(ways({ signedIn: false })),
      },
      {
        id: 'setting-up',
        title: 'A new account still being set up: the panel in the frame, on every step',
        path: GETTING_IN_PATHS.contributeStart,
        height: 480,
        render: () => firstStep(<ContributeSettingUp />),
      },
      {
        id: 'setup-failed',
        title: 'A new account whose first read failed: the panel in the frame, with Try again, on every step',
        path: GETTING_IN_PATHS.contributeStart,
        height: 480,
        render: () => firstStep(<ContributeSetupFailed />),
      },
      {
        id: 'no-profile',
        title: 'An account GitRanks does not read: the panel in the frame, nothing to try, on every step',
        path: GETTING_IN_PATHS.contributeStart,
        height: 440,
        render: () => firstStep(<ContributeNoProfile />),
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
      'components/workspace/getting-in/flow-back-here.tsx',
    ],
    states: [
      {
        id: 'signed-in',
        title: 'Signed in: the connect steps embedded, then on to the first issue',
        path: GETTING_IN_PATHS.contributeAgentOwn,
        height: 700,
        render: () =>
          firstStep(
            <>
              <FlowBack href={GETTING_IN_PATHS.contributeStart}>{BACK_TO_CHOICE}</FlowBack>
              <div className="flex flex-col gap-2">
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
          firstStep(
            <>
              <FlowBack href={GETTING_IN_PATHS.contributeStart}>{BACK_TO_CHOICE}</FlowBack>
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
      'app/(onboarding)/contribute/start/first-issue-list.tsx',
      'app/(workspace)/contribute/components/issue-list.tsx',
      'components/contribute/start/first-issue-step.tsx',
      'components/contribute/languages-dialog.tsx',
      'components/workspace/getting-in/flow-bookmark.tsx',
      'lib/contribute/start-flow.ts',
      'lib/workspace/onboarding.actions.ts',
    ],
    states: [
      {
        id: 'list',
        title: 'Your own agent connected, nothing saved: the profile’s languages, the list, the ways out',
        path: GETTING_IN_PATHS.contributeIssue,
        height: 1000,
        render: () => firstIssue(),
      },
      {
        id: 'opened',
        title: 'Opened from an issue: "The issue you opened" first, then the list',
        path: `${GETTING_IN_PATHS.contributeIssue}?issue=${WAY_BACK}`,
        height: 1240,
        render: () => firstIssue({ opened: true, saved: ['RUST', 'GO'] }),
      },
      {
        id: 'picking',
        title: 'The first issues still being picked, or picked again after a save: the page fills in by itself',
        path: GETTING_IN_PATHS.contributeIssue,
        height: 620,
        render: () => firstIssue({ state: 'picking', page: PICKING }),
      },
      {
        id: 'none',
        title: 'Nothing fits: Add a language opens the languages dialog',
        path: GETTING_IN_PATHS.contributeIssue,
        height: 640,
        render: () => firstIssue({ state: 'none', page: NONE }),
      },
      {
        id: 'mark-failed',
        title: 'Setting up failed twice: one line under the head, the ways out stay',
        path: GETTING_IN_PATHS.contributeIssue,
        height: 1040,
        render: () => firstIssue({ mark: 'error' }),
      },
      {
        id: 'nothing-connected',
        title: 'Setting up found nothing connected: the first step in place, no Continue',
        path: GETTING_IN_PATHS.contributeIssue,
        height: 1180,
        render: () => firstIssue({ mark: 'none' }),
      },
      {
        id: 'phone',
        title: 'On a phone',
        path: GETTING_IN_PATHS.contributeIssue,
        width: 390,
        height: 1500,
        render: () => firstIssue(),
      },
    ],
  },
];
