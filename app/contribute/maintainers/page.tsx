import type { Metadata } from 'next';
import { Suspense } from 'react';

import { MaintainerReposLoading, MaintainerReposPanel, MaintainersScreen } from '../components/maintainers-view';
import { loadMaintainerRepos } from '@/lib/contribute/maintainers.data';

export const metadata: Metadata = {
  title: 'For maintainers',
  description: 'How pull requests from GitRanks Contribute behave in your repo, and how to opt it out.',
};

/** Open to every visitor: the explanation renders at once, the visitor's repositories once GitHub answers. */
export default function MaintainersPage() {
  return (
    <MaintainersScreen
      repos={
        <Suspense fallback={<MaintainerReposLoading />}>
          <MaintainerRepos />
        </Suspense>
      }
    />
  );
}

async function MaintainerRepos() {
  return <MaintainerReposPanel view={await loadMaintainerRepos()} />;
}
