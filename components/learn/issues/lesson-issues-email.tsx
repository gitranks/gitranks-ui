'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { type ReactNode, type RefObject, useEffect, useRef, useState, useTransition } from 'react';

import { EmailNeedsAddress } from '@/components/learn/email-needs-address';
import { Button } from '@/components/ui/button';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { emailOnLineOf, type IssuesList, type IssuesView } from '@/lib/learn/issues';
import { setLearnLessonIssuesEmailAction } from '@/lib/learn/issues.actions';
import {
  LESSON_ISSUES_EMAIL_LABEL,
  LESSON_ISSUES_EMAIL_LINE,
  type LessonIssuesEmailState,
  listAfterLessonSave,
} from '@/lib/learn/lesson-issues-email';
import { learnSettingsErrorOf } from '@/lib/learn/settings';
import { learnSetupHrefOf } from '@/lib/workspace/paths';

/*
 * "Email me issues for my lessons" in the empty box of a lesson's view. The button and what takes its place keep one
 * spot, with the small line under them, so nothing on the page moves: a press while signed in with the Learn sign turns
 * the switch on, and the line that says where the email goes, with "Turn off", stands where the button stood. A visitor
 * signs in through Learn's onboarding, and a person without the Learn sign goes through it; both come back to the view,
 * where the button waits for their own press.
 */

/** The presses the box answers, and the save's state. */
export type LessonIssuesEmailHandlers = {
  pending?: boolean;
  error?: string | null;
  onTurnOn?: () => void;
  onTurnOff?: () => void;
};

const PLACE = 'flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 text-sm max-sm:min-h-11';

export function LessonIssuesEmail({
  state,
  back,
  pending = false,
  error = null,
  onTurnOn,
  onTurnOff,
}: {
  state: LessonIssuesEmailState;
  /** The view's own address: where the sign-in and the onboarding lead back to. */
  back: Route;
} & LessonIssuesEmailHandlers) {
  const control = useRef<HTMLButtonElement>(null);
  // The state a press was made from: once the box shows the other, the focus goes to the control now drawn.
  const pressedFrom = useRef<'off' | 'on' | null>(null);
  const shown = state.kind === 'on' || state.kind === 'no-address' ? 'on' : 'off';
  useEffect(() => {
    if (!pressedFrom.current || pressedFrom.current === shown) return;
    pressedFrom.current = null;
    control.current?.focus();
  }, [shown]);
  const press = (action: (() => void) | undefined) => () => {
    if (pending) return;
    pressedFrom.current = shown;
    action?.();
  };

  let place: ReactNode;
  if (state.kind === 'on' || state.kind === 'no-address') {
    place = (
      <>
        {state.kind === 'on' ? (
          <span className="text-foreground">{emailOnLineOf(state.to)}</span>
        ) : (
          <EmailNeedsAddress />
        )}
        <Button
          ref={control}
          type="button"
          variant="link"
          className="h-auto p-0 max-sm:min-h-11"
          aria-disabled={pending || undefined}
          onClick={press(onTurnOff)}
          data-lesson-issues-turn-off=""
        >
          Turn off
        </Button>
      </>
    );
  } else if (state.kind === 'setup') {
    place = (
      <Button asChild variant="outline" className="max-sm:min-h-11">
        <Link href={learnSetupHrefOf(back)} prefetch={false}>
          {LESSON_ISSUES_EMAIL_LABEL}
        </Link>
      </Button>
    );
  } else {
    const onClick =
      state.kind === 'visitor'
        ? () => {
            signIn(IDENTITY_PROVIDER, { redirectTo: learnSetupHrefOf(back) }).catch(() => {});
          }
        : state.kind === 'off'
          ? press(onTurnOn)
          : undefined;
    place = (
      <Button
        ref={control}
        type="button"
        variant="outline"
        className="max-sm:min-h-11"
        aria-disabled={state.kind === 'unread' || (state.kind === 'off' && pending) || undefined}
        onClick={onClick}
      >
        {LESSON_ISSUES_EMAIL_LABEL}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5" data-lesson-issues-email={state.kind}>
      <div className={PLACE}>{place}</div>
      <p className="m-0 max-w-prose text-xs text-muted-foreground">{LESSON_ISSUES_EMAIL_LINE}</p>
      {error ? (
        <p role="alert" className="m-0 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The box's presses for the person's list on the screen: turning the switch on with the view's lesson, or the whole
 * switch off, as Settings does. A save that answers changes the list it was made for, and only that one; a failure
 * says why under the box and changes nothing.
 */
export function useLessonIssuesEmail(
  setListOf: (forKey: string, change: (list: IssuesList) => IssuesList) => void,
  keyRef: RefObject<string>,
  viewRef: RefObject<IssuesView>,
): Required<LessonIssuesEmailHandlers> {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const turn = (on: boolean) =>
    startTransition(async () => {
      setError(null);
      const forKey = keyRef.current;
      const lesson = viewRef.current.lesson;
      const result = await setLearnLessonIssuesEmailAction(on, on ? lesson : null).catch(() => null);
      if (!result) setError(learnSettingsErrorOf('FAILED'));
      else if (!result.ok) setError(learnSettingsErrorOf(result.error));
      else if (!result.data) setError(learnSettingsErrorOf('CLOSED'));
      else {
        const saved = result.data;
        setListOf(forKey, (was) => listAfterLessonSave(was, saved, lesson));
      }
    });
  return { pending, error, onTurnOn: () => turn(true), onTurnOff: () => turn(false) };
}
