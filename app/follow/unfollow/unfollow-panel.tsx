'use client';

import { useActionState } from 'react';

import { UnfollowView } from '../components/unfollow-view';
import { changeFollow } from './actions';
import type { UnfollowState } from '@/lib/link-token/follow-pages';

/** The Unfollow page's panel: what the page read on load, then what each press answered. */
export function UnfollowPanel({ initial }: Readonly<{ initial: UnfollowState }>) {
  const [state, action, pending] = useActionState(changeFollow, initial);
  return <UnfollowView state={state} action={action} pending={pending} />;
}
