'use client';

import { useActionState } from 'react';

import { HeroOptOutView } from '../components/hero-link-views';
import { pressHeroOptOut } from './actions';
import type { HeroLinkState } from '@/lib/link-token/hero-pages';

/** The opt-out page's panel: what the page read on load, then what each press answered. */
export function HeroOptOutPanel({ initial }: Readonly<{ initial: HeroLinkState }>) {
  const [state, action, pending] = useActionState(pressHeroOptOut, initial);
  return <HeroOptOutView state={state} action={action} pending={pending} />;
}
