import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { IssuesEmail } from '@/components/learn/issues/issues-parts';
import { type IssuesLayer, IssuesScreen } from '@/components/learn/issues/issues-screen';
import {
  issuesNames,
  learnFixes,
  listNone,
  listOutsideForYou,
  personalList,
  views,
  visitorRows,
} from '@/lib/learn/__fixtures__/issues';
import { ISSUES_VIEW, type IssuesAt, type IssuesView } from '@/lib/learn/issues';

/**
 * Issues (Learn's lists of real issues to learn from), from fixtures, in every state. Held back from the export
 * (`exported: false`): the export is at its file limit.
 */

const SOURCES = [
  'components/learn/issues/issues-screen.tsx',
  'components/learn/issues/issues-parts.tsx',
  'components/learn/issues/issues-live.tsx',
  'lib/learn/issues.ts',
];

const draw = (view: IssuesView, layer: IssuesLayer, at: IssuesAt = 'issues') => (
  <IssuesScreen view={view} at={at} names={issuesNames} layer={layer} />
);

/** A labelled part of a board that shows several states one under the other. */
const Case = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-3 border-t pt-4">
    <span className="text-sm font-semibold text-foreground">{title}</span>
    {children}
  </div>
);

export const LEARN_ISSUES_SCREENS: Screen[] = [
  {
    id: 'learn-issues',
    title: 'Issues',
    area: 'learn',
    route: '/learn/issues',
    exported: false,
    sources: SOURCES,
    states: [
      {
        id: 'signed-in',
        title: 'Signed in: five issues, "For you" on, both counts',
        path: '/learn/issues',
        height: 1300,
        render: () => draw(ISSUES_VIEW, { kind: 'personal', list: personalList() }),
      },
      {
        id: 'visitor',
        title: 'A visitor: the same five for everyone, no switch, every lesson new',
        path: '/learn/issues',
        signedOut: true,
        height: 1300,
        render: () => draw(ISSUES_VIEW, { kind: 'visitor', rows: visitorRows }),
      },
      {
        id: 'outside-for-you',
        title: 'No issue for you: issues wait outside "For you"',
        path: '/learn/issues',
        height: 600,
        render: () => draw(ISSUES_VIEW, { kind: 'personal', list: listOutsideForYou() }),
      },
      {
        id: 'none-learned',
        title: 'None that uses a lesson you learned, the email on',
        path: '/learn/issues?learned=1',
        height: 600,
        render: () => draw(views.learned, { kind: 'personal', list: listNone({ learnedCount: 40, emailOn: true }) }),
      },
      {
        id: 'email',
        title: '"Email me when one appears": off, on, on with no address',
        path: '/learn/issues',
        height: 600,
        render: () => (
          <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-7 pb-16">
            <Case title="Off">
              <IssuesEmail state={{ kind: 'off' }} />
            </Case>
            <Case title="On">
              <IssuesEmail state={{ kind: 'on', to: 'y***@example.com' }} />
            </Case>
            <Case title="On, with no address">
              <IssuesEmail state={{ kind: 'no-address' }} />
            </Case>
            <Case title="A save that failed">
              <IssuesEmail state={{ kind: 'off' }} error="We could not save just now. Try again in a minute." />
            </Case>
          </main>
        ),
      },
      {
        id: 'course-fixed',
        title: 'A course\'s merged fixes ("Fixed")',
        path: '/learn/issues?course=algorithms&fixed=1',
        height: 700,
        render: () => draw(views.courseFixed, { kind: 'fixed', fixes: learnFixes }),
      },
      {
        id: 'language-empty',
        title: 'A visitor, a language with no issue',
        path: '/learn/issues?language=go',
        signedOut: true,
        height: 500,
        render: () => draw(views.language, { kind: 'visitor', rows: [] }),
      },
      {
        id: 'unavailable',
        title: 'The API does not answer the list yet',
        path: '/learn/issues',
        height: 500,
        render: () => draw(ISSUES_VIEW, { kind: 'unavailable' }),
      },
      {
        id: 'phone',
        title: 'On a phone',
        path: '/learn/issues',
        width: 390,
        height: 1900,
        render: () => draw(ISSUES_VIEW, { kind: 'personal', list: personalList() }),
      },
    ],
  },
];
