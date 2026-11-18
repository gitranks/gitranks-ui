'use client';

import { useActionState } from 'react';

import { ConfirmView } from '../components/confirm-view';
import { confirmFollow } from './actions';
import type { ConfirmState } from '@/lib/link-token/follow-pages';

/** The confirmation page's panel: what the page read on load, then what the press answered. */
export function ConfirmPanel({ initial }: Readonly<{ initial: ConfirmState }>) {
  const [state, action, pending] = useActionState(confirmFollow, initial);
  return <ConfirmView state={state} action={action} pending={pending} />;
}
