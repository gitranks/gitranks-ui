'use client';

import { useEffect } from 'react';

import { reportLearnEvent } from '@/components/contribute-click-tracker/contribute-click-tracker';

const PAGE_SOURCES = {
  lesson_opened: 'learn_lesson',
  result_opened: 'learn_result',
  progress_opened: 'learn_progress',
} as const;

/**
 * Counts a shared lesson's page, a result page or a public progress page opened, from the browser: the pages are the
 * same for every visitor, so the server cannot count them. Once per page shown. A progress page names no lesson.
 */
export function LearnViewReport({ source, lesson }: { source: keyof typeof PAGE_SOURCES; lesson?: string }) {
  useEffect(() => {
    reportLearnEvent({ kind: 'learn_view', event: source, source: PAGE_SOURCES[source] }, lesson);
  }, [source, lesson]);
  return null;
}
