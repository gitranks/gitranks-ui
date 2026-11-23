'use client';

import { useEffect, useState } from 'react';

import { LessonGoneLearnerBox } from './lesson-gone';
import { type LessonGoneState, lessonGoneLearnerLineOf } from '@/lib/learn/lesson-gone';
import type { LearnLessonMine } from '@/lib/learn/lesson-page';
import { learnLessonMinePath } from '@/lib/learn/paths';
import { useLearnSetupGuess } from '@/lib/learn/use-setup-guess';
import { hasSessionHint } from '@/lib/session-hint';

/** The person's side of a lesson from their route; null for a visitor, a person Learn is not open to, or a failure. */
export async function readLessonMine(slug: string): Promise<LearnLessonMine | null> {
  try {
    const res = await fetch(learnLessonMinePath(slug), { cache: 'no-store' });
    if (!res.ok) return null;
    const { mine } = (await res.json()) as { mine?: LearnLessonMine | null };
    return mine ?? null;
  } catch {
    return null;
  }
}

/**
 * The learner's line on a paused or removed lesson's page, read in the browser once the page is up: only a person with
 * a session asks, and only one who learned the lesson sees a box.
 */
export function LessonGoneLearner({ slug, state }: { slug: string; state: LessonGoneState }) {
  useLearnSetupGuess();
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    if (!hasSessionHint(document.cookie)) return;
    let live = true;
    readLessonMine(slug).then((mine) => {
      if (live) setLine(lessonGoneLearnerLineOf(state, mine));
    });
    return () => {
      live = false;
    };
  }, [slug, state]);
  return line ? <LessonGoneLearnerBox state={state} line={line} /> : null;
}
