'use client';

import { ArrowRight } from 'lucide-react';
import { useState } from 'react';

import { LessonFlow, type LessonFlowStart } from './lesson-flow';
import { INTRO_BUTTON, LessonIntro, ReadLesson } from './lesson-read';
import { Button } from '@/components/ui/button';
import type { LessonHead, LessonRun, LessonStep } from '@/lib/learn/learn.types';
import { isAuthorOf } from '@/lib/learn/lesson-public';

/**
 * A shared lesson for a signed-in viewer Learn is open to: their run when they have one (open, or their latest passed
 * one, which shows its summary), else the lesson to read with "Start the lesson". A run starts only when they ask,
 * never by opening the link.
 */
export function SharedLesson({
  head,
  steps,
  run,
  login,
  start,
}: {
  head: LessonHead;
  steps: readonly LessonStep[];
  run: LessonRun | null;
  /** The viewer's login, for their result page. */
  login: string;
  /** The catalogue's boards: a flow drawn part-way. */
  start?: LessonFlowStart;
}) {
  const [started, setStarted] = useState(!!run);
  if (started) {
    return (
      <LessonFlow
        shared={{ slug: head.slug, login, author: isAuthorOf(head, login) }}
        stage="LESSON"
        head={head}
        steps={steps}
        run={run}
        start={start}
      />
    );
  }
  return (
    <>
      <LessonIntro
        steps={steps.length}
        text="A wrong answer costs nothing: you get another question. Your result stays private unless you share it."
        action={
          <Button type="button" size="lg" onClick={() => setStarted(true)} className={INTRO_BUTTON}>
            Start the lesson
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        }
      />
      <ReadLesson head={head} steps={steps} />
    </>
  );
}
