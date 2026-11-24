'use client';

import { useState, useTransition } from 'react';

import { IssuesEmail } from '@/components/learn/issues/issues-parts';
import { issuesEmailStateOf } from '@/lib/learn/issues';
import { setLearnIssuesEmailAction } from '@/lib/learn/issues.actions';
import { learnSettingsErrorOf } from '@/lib/learn/settings';

/**
 * "Email me when one appears" in Learn home's quiet third box: the switch Issues draws on its empty end, for the
 * person's list with "For you" on. It changes in place; on with no address, the line says where the address is set.
 */
export function HomeIssuesEmail({ on: given, to }: { on: boolean; to: string | null }) {
  const [on, setOn] = useState(given);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const turn = (next: boolean) =>
    start(async () => {
      setError(null);
      const result = await setLearnIssuesEmailAction(next, next ? 'FOR_YOU' : null).catch(() => null);
      if (!result) setError(learnSettingsErrorOf('FAILED'));
      else if (!result.ok) setError(learnSettingsErrorOf(result.error));
      else if (!result.data) setError(learnSettingsErrorOf('CLOSED'));
      else setOn(result.data.newIssues);
    });
  return (
    <div className="mt-auto" data-home-issues-email="">
      <IssuesEmail
        state={issuesEmailStateOf({ emailOn: on, emailTo: to })}
        pending={pending}
        error={error}
        onTurnOn={() => turn(true)}
        onTurnOff={() => turn(false)}
      />
    </div>
  );
}
