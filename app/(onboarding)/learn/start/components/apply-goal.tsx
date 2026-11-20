'use client';

import { Loader2 } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { quickGoalInputOf } from '@/app/learn/components/learn-goal-quick';
import { Button } from '@/components/ui/button';
import { dropFlowQuery } from '@/components/workspace/getting-in/drop-query';
import { saveLearnProfile } from '@/lib/learn/actions';
import type { LearnProfile } from '@/lib/learn/learn.types';
import { levelFor } from '@/lib/learn/learn-home';
import type { LearnGoalPick } from '@/lib/learn/start-flow';

/**
 * The goal a visitor picked on Your goal, applied once from the browser after the sign-in brought them back (getting
 * in, §6.2): saved when the account has none (`saved` false), never over a saved one; then the page is read again
 * without the goal in its address (`moveTo`: moved on there instead, for an account that has entered). With a goal
 * saved, nothing is written and the goal leaves the address. "Saving your goal…" stands in the list's place meanwhile;
 * a failed save says so, with Try again (and, when the page moves on, a way on without saving). A page load never
 * writes on the server.
 */
export function ApplyLearnGoal({
  goal,
  profile,
  saved,
  moveTo,
}: {
  goal: LearnGoalPick | null;
  profile: LearnProfile | null;
  saved: boolean;
  moveTo?: Route;
}) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const ran = useRef(false);
  const writes = !saved && !!goal;

  const apply = () =>
    startTransition(async () => {
      if (!writes || !goal) {
        if (window.location.search) dropFlowQuery();
        return;
      }
      setFailed(false);
      const input = quickGoalInputOf(profile, goal.language, goal.level ?? levelFor(profile, goal.language));
      const result = input ? await saveLearnProfile(input).catch(() => null) : null;
      if (!result?.ok) {
        setFailed(true);
        return;
      }
      // Read again (now with the goal saved) at the address without the goal, or move on.
      router.replace(moveTo ?? (window.location.pathname as Route), { scroll: false });
    });

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    apply();
  });

  if (!writes) return null;
  if (!failed) {
    return (
      <p
        role="status"
        data-goal-apply="saving"
        className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3.5 text-sm text-muted-foreground"
      >
        <Loader2 aria-hidden="true" className="size-4 shrink-0 motion-safe:animate-spin" />
        Saving your goal…
      </p>
    );
  }
  return (
    <div
      role="alert"
      data-goal-apply="failed"
      className="flex flex-col items-start gap-2 rounded-xl border bg-card px-4 py-3.5 text-sm"
    >
      <p className="text-muted-foreground">Your goal could not be saved.</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="button" variant="outline" disabled={pending} onClick={apply} className="min-h-11 font-semibold">
          {pending ? 'Trying again…' : 'Try again'}
        </Button>
        {moveTo ? (
          <Link href={moveTo} prefetch={false} className="font-semibold text-link hover:underline">
            Continue without saving
          </Link>
        ) : null}
      </div>
    </div>
  );
}
