'use client';

import { signIn } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';

import { readPlanMine, startPlan, stopPlan } from './plan-send';
import { PlanView } from './plan-view';
import { INTERVIEWS_READ_WAIT_MS } from '@/components/interviews/interviews-read';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { interviewPlanPath, PLAN_START_QUERY } from '@/lib/interviews/paths';
import { planBoxOf } from '@/lib/interviews/plan';
import type { InterviewPlanMine, InterviewPlanPage, InterviewStopReason } from '@/lib/interviews/types';
import { hasSessionHint } from '@/lib/session-hint';

/** Where the person's side stands: not known yet, a visitor's page, or a session with its read (none when it failed). */
type Side = { kind: 'pending' } | { kind: 'visitor' } | { kind: 'session'; mine: InterviewPlanMine | null };

/** The plan's address with the query that starts it once the person is back from signing in. */
export const planStartAddressOf = (company: string, plan: string) =>
  `${interviewPlanPath(company, plan)}?${PLAN_START_QUERY}=1`;

/** Whether the address asks to start the plan, and the address without that query. */
function startAsked(): { asked: boolean; clean: string } {
  const url = new URL(window.location.href);
  const asked = url.searchParams.has(PLAN_START_QUERY);
  url.searchParams.delete(PLAN_START_QUERY);
  return { asked, clean: `${url.pathname}${url.search}${url.hash}` };
}

/**
 * A plan's page as it lives in the browser. The page is the same for everyone; once it is up, a person with a session
 * reads their side of the plan, which fills the box and the rounds' marks in place, and a visitor asks for nothing. A
 * visitor's "Sign in with GitHub to start" comes back here with `?start=1`: the page then starts the plan (unless it
 * is in progress or finished already) and drops the query from the address. Starting and stopping change the box
 * and the rounds in place.
 */
export function PlanLive({ plan, zone }: { plan: InterviewPlanPage; zone?: string }) {
  const [side, setSide] = useState<Side>({ kind: 'pending' });
  const [reading, setReading] = useState(true);
  const [stoppedNow, setStoppedNow] = useState(false);
  const [now] = useState(() => new Date());
  const company = plan.company.slug;
  const slug = plan.slug;

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setSide({ kind: 'visitor' });
      setReading(false);
      return;
    }
    let live = true;
    setSide({ kind: 'pending' });
    setReading(true);
    // One wait more than the read's own, for the start that may follow it.
    const late = setTimeout(() => setReading(false), INTERVIEWS_READ_WAIT_MS * 2);
    void (async () => {
      let mine = await readPlanMine(company, slug);
      const { asked, clean } = startAsked();
      if (asked) {
        window.history.replaceState(window.history.state, '', clean);
        if (mine && (mine.state === 'none' || mine.state === 'stopped')) {
          const sent = await startPlan(company, slug);
          if (sent.kind === 'ok') mine = sent.mine;
        }
      }
      if (!live) return;
      clearTimeout(late);
      setSide({ kind: 'session', mine });
      setReading(false);
    })();
    return () => {
      live = false;
      clearTimeout(late);
    };
  }, [company, slug]);

  const onSignIn = useCallback(async () => {
    try {
      await signIn(IDENTITY_PROVIDER, { redirectTo: planStartAddressOf(company, slug) });
      return true;
    } catch {
      return false;
    }
  }, [company, slug]);

  const onStart = useCallback(async () => {
    const sent = await startPlan(company, slug);
    if (sent.kind === 'signed_out') {
      setSide({ kind: 'visitor' });
      return true;
    }
    if (sent.kind !== 'ok') return false;
    setStoppedNow(false);
    setSide({ kind: 'session', mine: sent.mine });
    return true;
  }, [company, slug]);

  const onStop = useCallback(
    async (reason: InterviewStopReason | null) => {
      const sent = await stopPlan(company, slug, reason);
      if (sent.kind === 'signed_out') {
        setSide({ kind: 'visitor' });
        return true;
      }
      if (sent.kind !== 'ok') return false;
      setStoppedNow(true);
      setSide({ kind: 'session', mine: sent.mine });
      return true;
    },
    [company, slug],
  );

  const mine = side.kind === 'session' ? side.mine : null;
  const box = planBoxOf(plan, mine, { session: side.kind === 'session', stoppedNow });
  return (
    <PlanView
      plan={plan}
      box={box}
      mine={mine}
      reading={reading && side.kind === 'pending'}
      now={now}
      zone={zone}
      onSignIn={onSignIn}
      onStart={onStart}
      onStop={onStop}
    />
  );
}
