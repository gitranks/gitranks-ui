import { withBadgeFacts } from '../images';
import type { Screen } from '../registry';
import { bigRepo, bigRepoPulse, repoLanguages, repoRankTiers } from '@/app/repo/[owner]/[name]/__fixtures__/repo';
import { RepoScreen } from '@/app/repo/[owner]/[name]/components/repo-screen';
import { repoBig } from '@/badge/v3/fixtures';

const badges = withBadgeFacts(repoBig);

export const REPO_SCREENS: Screen[] = [
  {
    id: 'repo',
    title: 'Repository',
    area: 'repo',
    route: '/repo/[owner]/[name]',
    sources: [
      'app/repo/[owner]/[name]/components/repo-screen.tsx',
      'app/repo/[owner]/[name]/components/repo-layout.tsx',
      'app/repo/[owner]/[name]/components/repo-tier-card.tsx',
      'app/repo/[owner]/[name]/components/who-builds-it-card.tsx',
      'app/repo/[owner]/[name]/components/stars-best-section.tsx',
      'app/repo/[owner]/[name]/components/repo-pulse-area.tsx',
    ],
    states: [
      {
        id: 'supernova',
        title: 'A Supernova with analytics',
        path: `/repo/${bigRepo.nameWithOwner}`,
        height: 3800,
        render: () => (
          <RepoScreen
            repo={bigRepo}
            pulse={bigRepoPulse}
            languages={repoLanguages}
            tiers={repoRankTiers}
            badgeFacts={badges}
          />
        ),
      },
    ],
  },
];
