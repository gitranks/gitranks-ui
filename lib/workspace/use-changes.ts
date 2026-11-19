'use client';

import { useEffect, useRef } from 'react';

import { holdFastChanges, onContributeChanges } from './changes-bus';
import type { ContributeChangeArea } from './contribute.types';

/**
 * A page that waits on something soon holds the workspace's one poll fast, and reads at once, while `enabled`. With no
 * poll in the tab (no tabs, no `WorkspaceLive`) it does nothing.
 */
export function useFastChanges(enabled: boolean): void {
  useEffect(() => (enabled ? holdFastChanges() : undefined), [enabled]);
}

/**
 * Calls `onChange` once for each poll that names one of `areas`, while `enabled`; the latest `onChange` is called, so
 * it need not be stable. With no poll in the tab it is never called.
 */
export function useChanges(
  areas: readonly ContributeChangeArea[],
  onChange: (changed: readonly ContributeChangeArea[]) => void,
  enabled = true,
): void {
  const latest = useRef(onChange);
  latest.current = onChange;
  const key = areas.join(',');
  useEffect(() => {
    if (!enabled) return;
    const wanted = new Set(key.split(','));
    return onContributeChanges((changed) => {
      if (changed.some((area) => wanted.has(area))) latest.current(changed);
    });
  }, [key, enabled]);
}
