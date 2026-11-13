'use client';

import { useEffect } from 'react';

import { reportLearnEvent } from '@/components/contribute-click-tracker/contribute-click-tracker';

/**
 * Counts a shared lesson's page or a result page opened, from the browser: the pages are the same for every visitor,
 * so the server cannot count them. Once per page shown.
 */
export function LearnViewReport({ source, lesson }: { source: 'lesson_opened' | 'result_opened'; lesson: string }) {
  useEffect(() => {
    reportLearnEvent({ kind: 'learn_view', source }, lesson);
  }, [source, lesson]);
  return null;
}
