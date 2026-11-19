'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { readAttemptStage } from '../actions';
import { STOP_POLL, useVisiblePoll } from './use-visible-poll';
import type { LearnStage } from '@/lib/learn/learn.types';
import { OWN_LESSON_POLL_MS } from '@/lib/learn/learn-home';

/**
 * While a lesson's page waits for the agent: reads the attempt's stage every 15 seconds while the page is shown, and
 * reads the page again once it changed, so the lesson opens without a reload.
 */
export function AttemptStageWatch({ attemptId, stage }: { attemptId: string; stage: LearnStage }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  useVisiblePoll(async () => {
    const result = await readAttemptStage(attemptId);
    // Signed out, or the attempt is no longer the viewer's to read: asking again changes nothing.
    if (!result.ok) return result.error === 'SIGNED_OUT' || result.error === 'NOT_FOUND' ? STOP_POLL : undefined;
    if (result.data && result.data !== stage) startTransition(() => router.refresh());
  }, OWN_LESSON_POLL_MS);
  return null;
}
