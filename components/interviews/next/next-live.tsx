'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { NextView } from './next-view';
import { readInterviewsKeyWithin } from '@/components/interviews/interviews-read';
import { type NextScreen, nextScreenOf } from '@/lib/interviews/next';
import { interviewNextMinePath, interviewPlanPath, isInterviewPartKey } from '@/lib/interviews/paths';
import type { InterviewNext, InterviewPlanPage } from '@/lib/interviews/types';
import { hasSessionHint } from '@/lib/session-hint';

/** The part the address names (`?after=<course>/<group>`); null without one, or not of a part's shape. */
export function afterOfAddress(search: string): string | null {
  const after = new URLSearchParams(search).get('after');
  return isInterviewPartKey(after) ? after : null;
}

/** The person's connecting screen, from their route; null when there is none, on any failure, or past the wait. */
export async function readInterviewNext(company: string, plan: string, after: string): Promise<InterviewNext | null> {
  const answer = await readInterviewsKeyWithin(interviewNextMinePath(company, plan, after), 'next');
  return answer && typeof answer === 'object' ? (answer as InterviewNext) : null;
}

/** Whether the read is a screen to draw: the person's plan in progress, or just finished. */
const isDrawn = (next: InterviewNext | null): next is InterviewNext =>
  next?.mine.state === 'in_progress' || next?.mine.state === 'finished';

/**
 * The connecting screen as it lives in the browser. The page is the plan's, the same for everyone; once it is up, a
 * person with a session reads what they just did and where they stand, and the column fills in. It is for a person
 * with this plan in progress (or just finished): anyone else, with no session, a part the address does not name, a
 * plan not started or stopped, or a read that failed, goes on to the plan's own page, so nothing ends here.
 */
export function NextLive({ plan }: { plan: InterviewPlanPage }) {
  const router = useRouter();
  const [screen, setScreen] = useState<NextScreen | null>(null);
  const company = plan.company.slug;
  const slug = plan.slug;

  useEffect(() => {
    const after = afterOfAddress(window.location.search);
    const away = interviewPlanPath(company, slug);
    if (!after || !hasSessionHint(document.cookie)) {
      router.replace(away);
      return;
    }
    let live = true;
    void readInterviewNext(company, slug, after).then((next) => {
      if (!live) return;
      if (isDrawn(next)) setScreen(nextScreenOf(plan, next, after));
      else router.replace(away);
    });
    return () => {
      live = false;
    };
  }, [company, slug, plan, router]);

  return <NextView plan={plan} screen={screen} />;
}
