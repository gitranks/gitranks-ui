'use client';

import { signIn } from 'next-auth/react';
import { useState, useTransition } from 'react';

import { changeFollowing, resumeAddress, setFollowEvents, stopAllEmail } from '../actions';
import { FollowingView } from './following-view';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { type FollowingPressAnswer, postFollowingPress } from '@/lib/follow/follow-client';
import type { SettingsState } from '@/lib/link-token/follow-pages';
import { LINK_PAGES } from '@/lib/link-token/link-token';

/**
 * The settings page's panel: what the page read on load, then the page as each press answered it. A press that could
 * not reach following keeps the list on screen and says so. By an email's settings link each press is a server action
 * keyed by the link; for a signed-in viewer without one (`session`), a request to the site's own route, by the session.
 */
export function FollowingPanel({ initial, session = false }: Readonly<{ initial: SettingsState; session?: boolean }>) {
  const [state, setState] = useState<SettingsState>(initial);
  const [pending, startTransition] = useTransition();

  const press = (send: () => Promise<FollowingPressAnswer>) =>
    startTransition(async () => {
      let next: FollowingPressAnswer;
      try {
        next = await send();
      } catch {
        next = { kind: 'unavailable' };
      }
      setState((current) => {
        // A press that went nowhere keeps the list and says why: a session that ended asks for a new sign-in.
        if (next.kind === 'signed-out')
          return current.kind === 'list' ? { ...current, notice: { kind: 'sign-in' } } : current;
        return next.kind === 'unavailable' && current.kind === 'list'
          ? { ...current, notice: { kind: 'failed' } }
          : next;
      });
    });

  return (
    <FollowingView
      state={state}
      pending={pending}
      session={session}
      onSignIn={() => signIn(IDENTITY_PROVIDER, { redirectTo: LINK_PAGES.settings })}
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
