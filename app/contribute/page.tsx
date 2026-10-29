import { Suspense } from 'react';

import { Landing } from './components/landing';
import { OverviewStatus } from './components/overview-status';

/** The overview: the pitch for everyone it is open to, and where the user stands once they have a key. */
export default function ContributeOverview() {
  return (
    <Landing
      status={
        <Suspense fallback={null}>
          <OverviewStatus />
        </Suspense>
      }
    />
  );
}
