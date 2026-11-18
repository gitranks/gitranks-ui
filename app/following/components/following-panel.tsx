'use client';

import { useState, useTransition } from 'react';

import { changeFollowing, resumeAddress, setFollowEvents, stopAllEmail } from '../actions';
import { FollowingView } from './following-view';
import type { SettingsState } from '@/lib/link-token/follow-pages';

/**
 * The settings page's panel: what the page read on load, then the page as each press answered it. A press that could
 * not reach following keeps the list on screen and says so.
 */
export function FollowingPanel({ initial }: Readonly<{ initial: SettingsState }>) {
  const [state, setState] = useState<SettingsState>(initial);
  const [pending, startTransition] = useTransition();

  const press = (send: () => Promise<SettingsState>) =>
    startTransition(async () => {
      let next: SettingsState;
      try {
        next = await send();
      } catch {
        next = { kind: 'unavailable' };
      }
      setState((current) =>
        next.kind === 'unavailable' && current.kind === 'list' ? { ...current, notice: { kind: 'failed' } } : next,
      );
    });

  return (
    <FollowingView
      state={state}
      pending={pending}
      onEvents={(followId, events) => press(() => setFollowEvents(followId, events))}
      onChange={(followId, change) => press(() => changeFollowing(followId, change))}
      onResume={(subscriberId) => press(() => resumeAddress(subscriberId))}
      onStopAll={() => press(() => stopAllEmail())}
    />
  );
}
