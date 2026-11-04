'use client';

import { type ComponentType, createContext, type ReactNode, useContext } from 'react';

/** Whether a maintainer stopped GitRanks work on the contribution's PR: nothing of ours writes to it any more. */
const PrStopped = createContext(false);

export function PrStoppedProvider({ stopped, children }: { stopped: boolean; children: ReactNode }) {
  return <PrStopped.Provider value={stopped}>{children}</PrStopped.Provider>;
}

/** In place of a control that would write to a stopped PR: why it is not offered. */
export function PrStoppedLine() {
  return (
    <p data-pr-stopped-control="" className="text-sm text-muted-foreground">
      Not available: a maintainer stopped GitRanks work on this PR.
    </p>
  );
}

/**
 * A control that writes to the PR (a follow-up, an approval, a reply, a proof, a one-click fix), or the line saying
 * why it is not offered once a maintainer stopped GitRanks work on the PR.
 */
export function unlessPrStopped<P extends object>(Control: ComponentType<P>): ComponentType<P> {
  function Guarded(props: P) {
    return useContext(PrStopped) ? <PrStoppedLine /> : <Control {...props} />;
  }
  Guarded.displayName = `UnlessPrStopped(${Control.displayName ?? Control.name})`;
  return Guarded;
}
