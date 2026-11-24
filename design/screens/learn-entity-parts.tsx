import type { ReactNode } from 'react';

import type { Screen } from '../registry';
import { LearnEntityCard } from '@/components/learn/entity/learn-entity-card';
import { entityCards, orgEntity, repoEntity } from '@/lib/learn/__fixtures__/entity-card';

/**
 * The Learn card on a repository's and an organisation's page, from fixtures, in every state, before those pages use
 * it. Held back from the export (`exported: false`): the export is at its file limit.
 */

const REPO_PATH = '/repo/nebula/ui';
const ORG_PATH = '/org/nebula';

const frame = (children: ReactNode) => (
  <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-7 pb-16">{children}</main>
);

/** A labelled part of a board that shows several states one under the other. */
const Case = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="flex flex-col gap-3 border-t pt-4">
    <span className="text-sm font-semibold text-foreground">{title}</span>
    {children}
  </div>
);

export const LEARN_ENTITY_PART_SCREENS: Screen[] = [
  {
    id: 'learn-entity-card-repo',
    title: 'The Learn card on a repository',
    area: 'repo',
    route: '/repo/[owner]/[name]',
    exported: false,
    sources: ['components/learn/entity/learn-entity-card.tsx', 'lib/learn/entity-card.ts'],
    states: [
      {
        id: 'each',
        title: 'A course, fixes and open issues; no course; one fix; a new course',
        path: REPO_PATH,
        height: 1300,
        render: () =>
          frame(
            <>
              <Case title="A course, fixes and open issues">
                <LearnEntityCard card={entityCards.repoEverything} entity={repoEntity} />
              </Case>
              <Case title="No course: fixes and open issues">
                <LearnEntityCard card={entityCards.repoNoCourse} entity={repoEntity} />
              </Case>
              <Case title="One fix, no issue open">
                <LearnEntityCard card={entityCards.repoOneFix} entity={repoEntity} />
              </Case>
              <Case title="A new course and one open issue">
                <LearnEntityCard card={entityCards.repoNewCourse} entity={repoEntity} />
              </Case>
            </>,
          ),
      },
      {
        id: 'phone',
        title: 'On a phone: where a row leads goes under its text',
        path: REPO_PATH,
        width: 390,
        height: 700,
        render: () => frame(<LearnEntityCard card={entityCards.repoEverything} entity={repoEntity} />),
      },
    ],
  },
  {
    id: 'learn-entity-card-org',
    title: 'The Learn card on an organization',
    area: 'org',
    route: '/org/[login]',
    exported: false,
    sources: ['components/learn/entity/learn-entity-card.tsx', 'lib/learn/entity-card.ts'],
    states: [
      {
        id: 'each',
        title: 'The org’s course and one repository course; courses about four of its repositories',
        path: ORG_PATH,
        height: 1000,
        render: () =>
          frame(
            <>
              <Case title="The org’s course, a repository course, fixes and open issues">
                <LearnEntityCard card={entityCards.orgEverything} entity={orgEntity} />
              </Case>
              <Case title="Courses about four of its repositories">
                <LearnEntityCard card={entityCards.orgManyRepos} entity={orgEntity} />
              </Case>
            </>,
          ),
      },
    ],
  },
];
