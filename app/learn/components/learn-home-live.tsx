'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { readMyLearnAttempts } from '../actions';
import { useVisiblePoll } from './use-visible-poll';
import { OWN_LESSON_POLL_MS, ownLessonKeyOf } from '@/lib/learn/learn-home';

/**
 * While Learn home shows the viewer's own lesson in progress: reads it again every 15 seconds while the page is shown,
 * and reads the page again once it moved (`watching`: what the page shows now, as `ownLessonKeyOf` says it).
 */
export function LearnHomeLive({ watching }: { watching: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  useVisiblePoll(async () => {
    const result = await readMyLearnAttempts();
    if (result.ok && ownLessonKeyOf(result.data) !== watching) startTransition(() => router.refresh());
  }, OWN_LESSON_POLL_MS);
  return null;
}
