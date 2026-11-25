import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { HomeBoxesView } from '@/app/(workspace)/contribute/components/home-boxes';
import {
  agentRead,
  agentRun,
  homeRead,
  mergedRead,
  NEWEST_MERGED,
  needsYouRow,
} from '@/lib/contribute/__fixtures__/wave-4-parts';
import { type HomeBoxesRead, homeBoxesOf } from '@/lib/contribute/home-boxes';

/**
 * Contribute's parts for wave 4, from fixtures, in every case: home's three boxes, drawn by Contribute home and exported
 * with it. The start flow's boards are its pages' (`getting-in.tsx`); the landing's are its own (`contribute.tsx`).
 */

/** A labelled part of a board that shows several cases one under the other. */
const Case = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-3 border-t pt-4">
    <span className="text-sm font-semibold text-foreground">{title}</span>
    {children}
  </div>
);

const Page = ({ children }: { children: ReactNode }) => (
  <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-8 pb-16" data-design-parts="">
    {children}
  </main>
);

const boxes = (read: HomeBoxesRead) => <HomeBoxesView home={homeBoxesOf(read)} hints />;

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
