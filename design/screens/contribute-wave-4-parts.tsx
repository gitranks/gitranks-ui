import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { HomeBoxesView } from '@/app/(workspace)/contribute/components/home-boxes';
import { LandingProofCard } from '@/app/contribute/components/landing-parts/proof-card';
import { LandingProofRows } from '@/app/contribute/components/landing-parts/proof-rows';
import { LandingWayBox } from '@/app/contribute/components/landing-parts/way-box';
import { WhoDoesTheWork } from '@/components/contribute/start/who-does-the-work';
import { ComingSoon } from '@/components/workspace/agent/coming-soon';
import { LandingBand } from '@/components/workspace/getting-in/landing-band';
import {
  agentRead,
  agentRun,
  homeRead,
  landingBand,
  landingWays,
  mergedRead,
  NEWEST_MERGED,
  needsYouRow,
  proofMerged,
  proofOpenOnly,
  startRead,
} from '@/lib/contribute/__fixtures__/wave-4-parts';
import { type HomeBoxesRead, homeBoxesOf } from '@/lib/contribute/home-boxes';
import { landingProofOf } from '@/lib/contribute/landing-proof';
import { type StartWaysRead, startWaysOf } from '@/lib/contribute/start-ways';
import { MAINTAINERS_PATH } from '@/lib/workspace/paths';

/**
 * Contribute's parts for wave 4, from fixtures, in every case, before the pages use them: the landing's top card,
 * proof rows, two ways, coming-soon rows and band; the start flow's first page. Held back from the export
 * (`exported: false`) until the pages switch to them. Home's three boxes are drawn by Contribute home, so they are
 * exported.
 */

/** A labelled part of a board that shows several cases one under the other. */
const Case = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-3 border-t pt-4">
    <span className="text-sm font-semibold text-foreground">{title}</span>
    {children}
  </div>
);

const Page = ({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) => (
  <main
    className={`mx-auto flex w-full flex-col gap-8 px-4 pt-8 pb-16 ${narrow ? 'max-w-3xl' : 'max-w-7xl'}`}
    data-design-parts=""
  >
    {children}
  </main>
);

const proof = landingProofOf(proofMerged);
const band = (
  <LandingBand
    text={landingBand.text}
    href={MAINTAINERS_PATH as never}
    footer={
      <>
        {landingBand.footer[0]}
        <br />
        {landingBand.footer[1]}
      </>
    }
  />
);

const boxes = (read: HomeBoxesRead) => <HomeBoxesView home={homeBoxesOf(read)} hints />;

const ways = (read: Partial<StartWaysRead>) => <WhoDoesTheWork ways={startWaysOf(startRead(read))} />;

const LANDING_SOURCES = [
  'app/contribute/components/landing-parts/proof-card.tsx',
  'app/contribute/components/landing-parts/proof-rows.tsx',
  'app/contribute/components/landing-parts/way-box.tsx',
  'components/workspace/agent/coming-soon.tsx',
  'components/workspace/getting-in/landing-band.tsx',
  'lib/contribute/landing-proof.ts',
];

export const CONTRIBUTE_WAVE_4_PART_SCREENS: Screen[] = [
  {
    id: 'contribute-landing-parts',
    title: "Contribute's landing: the new parts",
    area: 'contribute',
    route: '/contribute',
    exported: false,
    sources: LANDING_SOURCES,
    states: [
      {
        id: 'proof',
        title: 'The top card and "Merged through GitRanks": merged, open only, and the ledger closed',
        path: '/contribute',
        signedOut: true,
        height: 1900,
        render: () => (
          <Page>
            <Case title="The newest merged pull request with a public page">
              {proof.card ? <LandingProofCard pr={proof.card} className="max-w-md" /> : <span />}
            </Case>
            <Case title="None merged yet: the newest open one">
              {landingProofOf(proofOpenOnly).card ? (
                <LandingProofCard pr={proofOpenOnly[0]} className="max-w-md" />
              ) : (
                <span />
              )}
            </Case>
            <Case title="Three merged: the rows, with the public ledger open">
              <LandingProofRows rows={proof.rows ?? []} ledgerOpen />
            </Case>
            <Case title="The public ledger closed: the heading stands alone">
              <LandingProofRows rows={proof.rows ?? []} ledgerOpen={false} />
            </Case>
          </Page>
        ),
      },
      {
        id: 'ways-and-more',
        title: 'Two ways, coming soon as rows, and the band',
        path: '/contribute',
        signedOut: true,
        height: 1500,
        render: () => (
          <Page>
            <Case title="Two ways to contribute">
              <div className="grid gap-4 md:grid-cols-2">
                {landingWays.map((way) => (
                  <LandingWayBox key={way.title} way={way} />
                ))}
              </div>
            </Case>
            <Case title="Coming soon, one row a provider">
              <ComingSoon viewer="visitor" variant="rows" />
            </Case>
            <Case title="Honest with maintainers">{band}</Case>
          </Page>
        ),
      },
      {
        id: 'phone',
        title: 'On a phone',
        path: '/contribute',
        signedOut: true,
        width: 390,
        height: 2600,
        render: () => (
          <Page>
            {proof.card ? <LandingProofCard pr={proof.card} /> : null}
            <LandingWayBox way={landingWays[0]} />
            <ComingSoon viewer="visitor" variant="rows" />
            <LandingProofRows rows={proof.rows ?? []} ledgerOpen />
            {band}
          </Page>
        ),
      },
    ],
  },
  {
    id: 'contribute-start-who',
    title: 'Start, step 1: how Contribute works, and who does the work',
    area: 'contribute',
    route: '/contribute/start',
    exported: false,
    sources: ['components/contribute/start/who-does-the-work.tsx', 'lib/contribute/start-ways.ts'],
    states: [
      {
        id: 'signed-in',
        title: 'Signed in, nothing connected',
        path: '/contribute/start',
        height: 1100,
        render: () => <Page narrow>{ways({})}</Page>,
      },
      {
        id: 'visitor',
        title: 'A visitor, opened from an issue',
        path: '/contribute/start?issue=q7k2m9xa',
        signedOut: true,
        height: 1150,
        render: () => <Page narrow>{ways({ signedIn: false, issue: 'q7k2m9xa', issueReads: true })}</Page>,
      },
      {
        id: 'no-sign',
        title: 'Connected, no Contribute sign: the step is done',
        path: '/contribute/start',
        height: 2600,
        render: () => (
          <Page narrow>
            <Case title="An agent of their own">{ways({ own: 'Claude Code' })}</Case>
            <Case title="A Claude key">{ways({ key: 'connected' })}</Case>
            <Case title="Both">{ways({ own: 'Claude Code', key: 'connected' })}</Case>
          </Page>
        ),
      },
      {
        id: 'with-sign',
        title: 'Connected, with the Contribute sign: back to add the other way',
        path: '/contribute/start',
        height: 2600,
        render: () => (
          <Page narrow>
            <Case title="An agent of their own">{ways({ sign: true, own: 'Claude Code' })}</Case>
            <Case title="A Claude key, with an attempt">{ways({ sign: true, key: 'connected', attempt: true })}</Case>
            <Case title="Both">{ways({ sign: true, own: 'Claude Code', key: 'connected' })}</Case>
          </Page>
        ),
      },
      {
        id: 'key-invalid',
        title: 'The Claude key stopped working, nothing else connected',
        path: '/contribute/start',
        height: 1100,
        render: () => <Page narrow>{ways({ key: 'invalid' })}</Page>,
      },
      {
        id: 'phone',
        title: 'On a phone',
        path: '/contribute/start',
        width: 390,
        height: 1700,
        render: () => <Page narrow>{ways({})}</Page>,
      },
    ],
  },
];

/** Contribute home's three boxes in every case: drawn by the page, so exported with it. */
export const CONTRIBUTE_HOME_BOX_SCREENS: Screen[] = [
  {
    id: 'contribute-home-boxes',
    title: 'Contribute home: the three boxes',
    area: 'contribute',
    route: '/contribute',
    sources: [
      'app/(workspace)/contribute/components/home-boxes.tsx',
      'components/workspace/home-box.tsx',
      'lib/contribute/home-boxes.ts',
    ],
    states: [
      {
        id: 'needs-you',
        title: 'A pull request needs the person: box 1 lit; then nothing needs them; then a failed read',
        path: '/contribute',
        height: 1000,
        render: () => (
          <Page>
            <Case title="Needs you, two more waiting; an agent at work; merged">
              {boxes(
                homeRead({
                  needsYou: [
                    needsYouRow({ box: 'ROUND_WAITING', round: 2 }),
                    needsYouRow({ since: '2026-11-25T08:00:00Z', issueNumber: 7 }),
                    needsYouRow({ since: '2026-11-25T09:00:00Z', issueNumber: 9 }),
                  ],
                  agent: agentRead({ runs: [agentRun()] }),
                }),
              )}
            </Case>
            <Case title="Nothing needs the person, nothing working: no highlight">{boxes(homeRead())}</Case>
            <Case title="The lists could not be read">
              {boxes(homeRead({ needsYou: null, agent: agentRead({ runs: null, key: true }), merged: null }))}
            </Case>
          </Page>
        ),
      },
      {
        id: 'needs-you-rows',
        title: 'Box 1 for each row that needs the person',
        path: '/contribute',
        height: 1700,
        render: () => (
          <Page>
            <Case title="The fix walkthrough is ready">
              {boxes(homeRead({ needsYou: [needsYouRow({ box: 'WALKTHROUGH' })] }))}
            </Case>
            <Case title="The walkthrough needs another pass">
              {boxes(
                homeRead({ needsYou: [needsYouRow({ box: 'WALKTHROUGH', walkthroughBlocked: { reason: null } })] }),
              )}
            </Case>
            <Case title="A round is ready">
              {boxes(homeRead({ needsYou: [needsYouRow({ box: 'ROUND_READY', round: 2 })] }))}
            </Case>
            <Case title="Only the person can do it">
              {boxes(homeRead({ needsYou: [needsYouRow({ box: 'ONLY_YOU' })] }))}
            </Case>
          </Page>
        ),
      },
      {
        id: 'agent',
        title: 'Box 2 in every case',
        path: '/contribute',
        height: 3200,
        render: () => (
          <Page>
            <Case title="Several runs">
              {boxes(
                homeRead({
                  agent: agentRead({
                    key: true,
                    runs: [
                      agentRun({ runner: 'MANAGED_AGENTS' }),
                      agentRun({ attemptId: 'b', runner: 'MANAGED_AGENTS', phase: 'RUNNING_CHECKS' }),
                      agentRun({ attemptId: 'c' }),
                    ],
                  }),
                }),
              )}
            </Case>
            <Case title="Nothing connected: box 2 lit">{boxes(homeRead({ agent: agentRead({ own: null }) }))}</Case>
            <Case title="The key stopped working">
              {boxes(
                homeRead({
                  agent: agentRead({
                    own: null,
                    notice: { kind: 'key-invalid' },
                  }),
                }),
              )}
            </Case>
            <Case title="The credits are used up for this cycle">
              {boxes(
                homeRead({
                  agent: agentRead({
                    own: null,
                    notice: { kind: 'exhausted', until: '2026-12-01T00:00:00.000Z' },
                  }),
                }),
              )}
            </Case>
            <Case title="The workspace's spend limit is reached">
              {boxes(
                homeRead({
                  agent: agentRead({
                    own: null,
                    notice: { kind: 'limit-reached', until: '2026-12-01T00:00:00.000Z' },
                  }),
                }),
              )}
            </Case>
            <Case title="A cap holds the hosted agent">
              {boxes(
                homeRead({ agent: agentRead({ own: null, key: true, capHold: { period: 'week', attemptCapUsd: 2 } }) }),
              )}
            </Case>
            <Case title="The even pace holds a hosted agent that picks its own issues">
              {boxes(
                homeRead({
                  agent: agentRead({ own: null, key: true, paceHold: { at: '14:00 UTC', picksOwn: true } }),
                }),
              )}
            </Case>
            <Case title="The even pace holds, the person picks the issues">
              {boxes(
                homeRead({
                  agent: agentRead({ own: null, key: true, paceHold: { at: '14:00 UTC', picksOwn: false } }),
                }),
              )}
            </Case>
          </Page>
        ),
      },
      {
        id: 'merged',
        title: 'Box 3 in every case',
        path: '/contribute',
        height: 2100,
        render: () => (
          <Page>
            <Case title="Several merged, in one project">
              {boxes(homeRead({ merged: mergedRead({ merged: 2, reposHelped: 1, newest: NEWEST_MERGED }) }))}
            </Case>
            <Case title="The first one merged">
              {boxes(homeRead({ merged: mergedRead({ merged: 1, reposHelped: 1, newest: NEWEST_MERGED }) }))}
            </Case>
            <Case title="The first one merged, with no public page">
              {boxes(
                homeRead({
                  merged: mergedRead({ merged: 1, reposHelped: 1, newest: { ...NEWEST_MERGED, publicPage: null } }),
                }),
              )}
            </Case>
            <Case title="Pull requests wait for their maintainers">
              {boxes(homeRead({ merged: mergedRead({ waiting: 1 }) }))}
            </Case>
            <Case title="Nothing yet">{boxes(homeRead({ merged: mergedRead() }))}</Case>
          </Page>
        ),
      },
      {
        id: 'first-day',
        title: 'The first day: what will happen, in order',
        path: '/contribute',
        height: 800,
        render: () => (
          <Page>
            <Case title="An agent connected: box 1 lit">{boxes(homeRead({ firstDay: true }))}</Case>
            <Case title="Nothing connected: connecting is lit">
              {boxes(homeRead({ firstDay: true, agent: agentRead({ own: null }) }))}
            </Case>
          </Page>
        ),
      },
      {
        id: 'phone',
        title: 'On a phone: one under the other',
        path: '/contribute',
        width: 390,
        height: 1000,
        render: () => <Page>{boxes(homeRead({ needsYou: [needsYouRow()] }))}</Page>,
      },
    ],
  },
];
