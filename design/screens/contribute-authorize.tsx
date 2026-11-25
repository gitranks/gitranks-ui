import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { AuthorizeScreen, type AuthorizeState } from '@/app/contribute/components/authorize-view';
import { Header } from '@/components/header/header';
import type { ContributeOAuthRequest } from '@/lib/workspace/contribute.types';

/**
 * The page where a person allows their agent (`/contribute/authorize`): "How it works" above what the agent will be
 * able to do, then Allow; and "Already allowed", with "Finish setting up" for a person who has gone through neither
 * onboarding. Held back from the export (`exported: false`): the export is at its file limit.
 */

const ID = 'aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789-_abcde';
const PATH = `/contribute/authorize?request=${ID}`;

const REQUEST: ContributeOAuthRequest = {
  status: 'PENDING',
  clientName: 'Claude Code',
  clientWhere: { kind: 'LOOPBACK', label: 'this computer' },
  previewAllowed: true,
  reusesConnection: false,
  replaces: null,
  waiting: { count: 12 },
};

/** The page as it is drawn: the site header, then the card in its column. */
const frame = (children: ReactNode) => (
  <>
    <Header />
    <main className="mx-auto flex w-full max-w-xl flex-col px-4 pt-10 pb-16">{children}</main>
  </>
);
const draw = (state: AuthorizeState) => frame(<AuthorizeScreen state={state} />);

export const CONTRIBUTE_AUTHORIZE_SCREENS: Screen[] = [
  {
    id: 'contribute-authorize',
    title: 'Allow an agent: how it works, what it can do, and after Allow',
    area: 'contribute',
    route: '/contribute/authorize',
    exported: false,
    sources: [
      'app/(public)/contribute/authorize/page.tsx',
      'app/contribute/components/authorize-view.tsx',
      'app/contribute/components/authorize-actions.tsx',
      'app/contribute/components/authorize-next-step.tsx',
      'lib/workspace/oauth-consent.ts',
    ],
    states: [
      {
        id: 'ask',
        title: 'The ask: "How it works" above what the agent will be able to do, then Allow',
        path: PATH,
        height: 1080,
        render: () => draw({ kind: 'pending', requestId: ID, login: 'octocat', request: REQUEST, setup: true }),
      },
      {
        id: 'allowed-setup',
        title: 'Already allowed, by a person with neither sign: "Finish setting up"',
        path: PATH,
        height: 560,
        render: () => draw({ kind: 'approved', requestId: ID, clientName: 'Claude Code', setup: true }),
      },
      {
        id: 'allowed',
        title: 'Already allowed, by a person with a sign: what to ask the agent',
        path: PATH,
        height: 760,
        render: () => draw({ kind: 'approved', requestId: ID, clientName: 'Claude Code', setup: false }),
      },
    ],
  },
];
