'use client';

import { useState, useTransition } from 'react';

import { changeFollowing, resumeAddress, setFollowEvents, stopAllEmail } from '../actions';
import { FollowingView } from './following-view';
import { postFollowingPress } from '@/lib/follow/follow-client';
import type { SettingsState } from '@/lib/link-token/follow-pages';

/**
 * The settings page's panel: what the page read on load, then the page as each press answered it. A press that could
 * not reach following keeps the list on screen and says so. By an email's settings link each press is a server action
 * keyed by the link; for a signed-in viewer without one (`session`), a request to the site's own route, by the session.
 */
export function FollowingPanel({ initial, session = false }: Readonly<{ initial: SettingsState; session?: boolean }>) {
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
      session={session}
      onEvents={(followId, events) =>
        press(() =>
          session ? postFollowingPress({ action: 'events', followId, events }) : setFollowEvents(followId, events),
        )
      }
      onChange={(followId, change) =>
        press(() => (session ? postFollowingPress({ action: change, followId }) : changeFollowing(followId, change)))
      }
      onResume={(subscriberId) =>
        press(() => (session ? postFollowingPress({ action: 'resume', subscriberId }) : resumeAddress(subscriberId)))
      }
      onStopAll={() => press(() => (session ? postFollowingPress({ action: 'stop-all' }) : stopAllEmail()))}
    />
  );
}
