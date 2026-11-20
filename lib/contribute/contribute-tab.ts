import type { Route } from 'next';

import type { ContributeHostedLevel, ContributeSideTotals } from '@/lib/workspace/contribute.types';
import { pullRequestsPath } from '@/lib/workspace/paths';

/** The Contribute tab: its four numbers, the line over the issues, and the limit state. */

/** What the tab reads beside the user's view: its side's totals, who paused, the hosted agent's level. */
export type ContributeTabRead = {
  /** Contribute's pull requests by state; null when the API does not answer them. */
  totals: ContributeSideTotals | null;
  /** The person paused contributing themselves; false from an API that does not say. */
  pausedByYou: boolean;
  /** Null from an API without levels. */
  hostedLevel: ContributeHostedLevel | null;
};

export type NumberTile = { value: string; label: string; href: Route };

const count = (value: number | undefined) => (typeof value === 'number' ? value.toLocaleString('en-US') : '–');

/** The four numbers of Contribute's pull requests, each a link to the Pull requests tab filtered to this side. */
export function numberTilesOf(totals: ContributeSideTotals | null | undefined): NumberTile[] {
  const decided = totals ? totals.merged + totals.closed : 0;
  return [
    {
      value: count(totals?.merged),
      label: 'pull requests merged',
      href: pullRequestsPath({ state: 'merged', made: 'contribute' }),
    },
    {
      value: count(totals?.open),
      label: 'open, waiting on maintainers',
      href: pullRequestsPath({ state: 'open', made: 'contribute' }),
    },
    {
      value: count(totals?.reposHelped),
      label: 'repos helped',
      href: pullRequestsPath({ state: 'merged', made: 'contribute' }),
    },
    {
      value: totals && decided ? `${Math.round((totals.merged / decided) * 100)}%` : '–',
      label: 'merged, of those decided',
      href: pullRequestsPath({ made: 'contribute' }),
    },
  ];
}

/** The line under "Issues for you": by the agents connected now and the hosted agent's level. */
export type IntroLine = { text: string; agentLink: boolean; after?: string };

export function introLineOf(agents: { hosted: boolean; own: boolean }, level: ContributeHostedLevel | null): IntroLine {
  if (agents.hosted) {
    return level === 'NEXT' || level === 'AUTOPILOT'
      ? {
          text: 'Pick an issue and press Start. The hosted agent also starts the next one by itself; change that on the ',
          agentLink: true,
          after: '.',
        }
      : {
          text: 'Pick an issue and press Start. The hosted agent can also start the next one by itself: set that on the ',
          agentLink: true,
          after: '.',
        };
  }
  if (agents.own) return { text: 'Pick an issue and press Start.', agentLink: false };
  return {
    text: 'Pick an issue and press Start: the next page connects your agent. Or add a Claude key on the ',
    agentLink: true,
    after: '.',
  };
}
