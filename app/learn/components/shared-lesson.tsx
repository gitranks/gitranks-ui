'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { LessonFlow, type LessonFlowStart } from '@/components/learn/lesson-flow';
import { INTRO_BUTTON, LessonIntro, ReadLesson } from '@/components/learn/lesson-read';
import { Button } from '@/components/ui/button';
import type { LessonHead, LessonRun, LessonStep, PracticeNext } from '@/lib/learn/learn.types';
import { isAuthorOf } from '@/lib/learn/lesson-public';
import { contributeSource } from '@/lib/workspace/click-tracking';
import { PICK_ISSUE_PATHS } from '@/lib/workspace/paths';

/** A practice lesson's intro: what it is for, and the way past it to the learner's own issue. */
function PracticeIntroText() {
  return (
    <>
      This one was written for someone else’s fix. Yours will be written for the issue you pick, by your agent, for your
      goal. No agent needed here.{' '}
      <Link
        href={PICK_ISSUE_PATHS.learn}
        prefetch={false}
        className="font-semibold text-link hover:underline"
        {...contributeSource('learn_practice_skip')}
      >
        Skip it: pick your issue →
      </Link>
    </>
  );
}

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
  practice = false,
  next,
}: {
  head: LessonHead;
  steps: readonly LessonStep[];
  run: LessonRun | null;
  /** The viewer's login, for their result page. */
  login: string;
  /** The catalogue's boards: a flow drawn part-way. */
  start?: LessonFlowStart;
  /** Another learner's lesson, taken as practice: its intro says so, and its end leads to the viewer's own lesson. */
  practice?: boolean;
  /** What the passed card offers next, when already read (the catalogue). */
  next?: PracticeNext | null;
}) {
  const [started, setStarted] = useState(!!run);
  if (started) {
    return (
      <LessonFlow
        shared={{ slug: head.slug, login, author: isAuthorOf(head, login), next }}
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
        title={practice ? 'A practice lesson: see how a lesson works' : undefined}
        text={
          practice ? (
            <PracticeIntroText />
          ) : (
            'A wrong answer costs nothing: you get another question. Your result stays private unless you share it.'
          )
        }
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
