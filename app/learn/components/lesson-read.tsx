import type { ReactNode } from 'react';
import { FaGithub } from 'react-icons/fa';

import { LearnSignInButton } from './learn-sign-in';
import { LESSON_GRID, StepArticle } from './lesson-flow';
import { LessonSteps } from './lesson-steps';
import { WrittenFor } from './written-for';
import { buttonVariants } from '@/components/ui/button';
import type { LessonHead, LessonStep } from '@/lib/learn/learn.types';
import { cn } from '@/lib/utils';

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];

/** "Five steps, one question each." */
export const stepsLineOf = (count: number) =>
  `${WORDS[count] ?? count} step${count === 1 ? '' : 's'}, one question each.`;

/** The lesson's one call to action, beside what it is: sign in, start, or why answering is closed. */
export function LessonIntro({ steps, text, action }: { steps: number; text: string; action?: ReactNode }) {
  return (
    <section
      className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-brand-soft px-5 py-4"
      data-lesson-intro=""
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-lg font-semibold">A 10-minute lesson from a real fix</h2>
          <p className="text-sm text-muted-foreground">
            {stepsLineOf(steps)} {text}
          </p>
        </div>
        {action}
      </div>
    </section>
  );
}

/** The call to action's own size: the page's one primary button. */
export const INTRO_BUTTON = 'h-10 min-h-11 shrink-0 px-5 text-base font-semibold max-sm:w-full';

/** A visitor's "Sign in to take it": the GitHub sign-in, back to the lesson. */
export function SignInToTake({ returnTo, label = 'Sign in to take it' }: { returnTo: string; label?: string }) {
  return (
    <LearnSignInButton redirectTo={returnTo} className={cn(buttonVariants(), INTRO_BUTTON)}>
      <FaGithub aria-hidden="true" className="size-4 shrink-0" />
      {label}
    </LearnSignInButton>
  );
}

/** Under each step for a visitor: the step's question waits for a GitHub sign-in. */
function SignInToAnswer({ returnTo, index }: { returnTo: string; index: number }) {
  return (
    <section
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed bg-card px-4.5 py-3.5"
      data-sign-in-to-answer=""
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Question · step {index + 1}
        </span>
        <span className="text-sm text-muted-foreground">One question on this step, answered after a sign-in.</span>
      </div>
      <LearnSignInButton
        redirectTo={returnTo}
        className={cn(buttonVariants({ variant: 'outline' }), 'shrink-0 max-sm:min-h-11')}
      >
        <FaGithub aria-hidden="true" className="size-4 shrink-0" />
        Sign in to answer
      </LearnSignInButton>
    </section>
  );
}

/**
 * The whole lesson to read, every step in order beside the rail of steps, which links to each. For a visitor each step
 * ends with its question waiting for a sign-in (`signInTo`, the address to come back to).
 */
export function ReadLesson({
  head,
  steps,
  signInTo,
}: {
  head: LessonHead;
  steps: readonly LessonStep[];
  signInTo?: string;
}) {
  return (
    <div className={LESSON_GRID} data-lesson-read="">
      <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
        <LessonSteps steps={steps} results={[]} shownId={steps[0]?.id ?? null} anchors />
        <WrittenFor writtenFor={head.writtenFor} author className="max-lg:hidden" />
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col gap-4">
            <StepArticle step={step} index={index} count={steps.length} />
            {signInTo ? <SignInToAnswer returnTo={signInTo} index={index} /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
