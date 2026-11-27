'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { readInterviewsKeyWithin } from '@/components/interviews/interviews-read';
import { LessonSettingContext, type LessonSettingState } from '@/components/workspace/player/lesson-setting';
import {
  type LessonInPlan,
  type LessonPlace,
  lessonSettingOf,
  type PlanAddress,
  planQueryOf,
} from '@/lib/interviews/lesson-in-plan';
import { interviewLessonMinePath, PLAN_QUERY } from '@/lib/interviews/paths';
import { hasSessionHint } from '@/lib/session-hint';
import type { LessonSetting } from '@/lib/workspace/lesson-setting';

/** The plan the address names (`?plan=<company>/<plan>`), read in the browser; null without one, or not of slugs. */
export function planOfAddress(search: string): PlanAddress | null {
  return planQueryOf(new URLSearchParams(search).get(PLAN_QUERY));
}

/**
 * How long the lesson's place in the plan is waited for. A right answer waits for it, and one sent without the plan
 * starts the course, which cannot be undone: so the wait is longer than Interviews' other reads, which only draw.
 */
export const LESSON_IN_PLAN_WAIT_MS = 15_000;

/** The lesson inside the person's plan, from their route; null when it is not, and on any failure or past the wait. */
export async function readLessonInPlan(address: PlanAddress, lesson: LessonPlace): Promise<LessonInPlan | null> {
  const answer = await readInterviewsKeyWithin(
    interviewLessonMinePath(address, lesson),
    'lesson',
    LESSON_IN_PLAN_WAIT_MS,
  );
  return answer && typeof answer === 'object' ? (answer as LessonInPlan) : null;
}

/**
 * Learn's lesson page, opened from a plan. The page is the same for everyone, and so is what this part draws: its
 * children, as they are. Once the page is up, with `?plan=` on the address and a session, it asks whether the
 * person's plan in progress holds the lesson; when it does, the lesson's strip, its main button after a right answer
 * and the line under it follow the plan. A right answer given while that is read waits for the answer, so it is sent
 * with the plan only when the person is in it. Without `?plan=`, or without a session, nothing is asked and the lesson
 * is Learn's plain lesson. `titles`: the lessons of the lesson's group, for the next one's name.
 */
export function LessonInPlanProvider({
  lesson,
  titles,
  children,
}: {
  lesson: LessonPlace;
  titles: readonly { slug: string; title: string }[];
  children: ReactNode;
}) {
  // The read, once the page knows the address asks for one; none while there is nothing to ask.
  const [read, setRead] = useState<Promise<LessonSetting | null> | null>(null);
  const [setting, setSetting] = useState<LessonSetting | null>(null);
  const { slug, course, group } = lesson;

  // biome-ignore lint/correctness/useExhaustiveDependencies: the titles come with the lesson, whose slugs say when to read again.
  useEffect(() => {
    setSetting(null);
    const address = planOfAddress(window.location.search);
    if (!address || !hasSessionHint(document.cookie)) {
      setRead(null);
      return;
    }
    let live = true;
    const place = { slug, course, group };
    const reading = readLessonInPlan(address, place).then((inPlan) =>
      inPlan ? lessonSettingOf(inPlan, slug, titles) : null,
    );
    setRead(reading);
    void reading.then((found) => {
      if (live) setSetting(found);
    });
    return () => {
      live = false;
    };
  }, [slug, course, group]);

  const value = useMemo<LessonSettingState | null>(
    () => (read ? { setting, settled: () => read } : null),
    [read, setting],
  );
  return <LessonSettingContext value={value}>{children}</LessonSettingContext>;
}
