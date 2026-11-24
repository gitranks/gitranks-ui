import { withBadgeFacts } from '../images';
import type { Screen } from '../registry';
import { nebulaOrg } from '@/app/org/[login]/__fixtures__/org';
import { OrgScreen } from '@/app/org/[login]/components/org-screen';
import { orgBig } from '@/badge/v3/fixtures';
import { Header } from '@/components/header/header';
import { entityCards } from '@/lib/learn/__fixtures__/entity-card';

const badges = withBadgeFacts(orgBig);

export const ORG_SCREENS: Screen[] = [
  {
    id: 'org',
    title: 'Organization',
    area: 'org',
    route: '/org/[login]',
    sources: [
      'app/org/[login]/components/org-screen.tsx',
      'app/org/[login]/components/layout-left-column.tsx',
      'app/org/[login]/components/org-top-repos.tsx',
      'app/org/[login]/components/pulse/org-pulse-sections.tsx',
      'components/learn/entity/learn-entity-card.tsx',
    ],
    states: [
      {
        id: 'top',
        title: 'Near the top, with analytics and the Learn card',
        path: `/org/${nebulaOrg.login}`,
        height: 3500,
        render: () => (
          <>
            {/* The organization layout: the header, titled with the login. */}
            <Header title={nebulaOrg.login ?? undefined} />
            <OrgScreen
              login={nebulaOrg.login ?? ''}
              org={nebulaOrg}
              badgeFacts={badges}
              learnCard={entityCards.orgEverything}
              now={new Date()}
            />
          </>
        ),
      },
    ],
  },
];
