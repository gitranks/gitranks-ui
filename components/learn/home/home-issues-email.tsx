'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { ADDRESS_READ_GAP_MS } from '@/components/learn/issues/issues-live';
import { IssuesEmail } from '@/components/learn/issues/issues-parts';
import { issuesEmailStateOf } from '@/lib/learn/issues';
import { setLearnIssuesEmailAction } from '@/lib/learn/issues.actions';
import { LEARN_HOME_ISSUES_EMAIL_MINE_PATH } from '@/lib/learn/paths';
import { learnSettingsErrorOf } from '@/lib/learn/settings';

type HomeEmail = { emailOn: boolean; emailTo: string | null };

/** The person's list email, from their route; null on any failure or when it is not answered. */
export async function readHomeIssuesEmail(): Promise<HomeEmail | null> {
  try {
    const res = await fetch(LEARN_HOME_ISSUES_EMAIL_MINE_PATH, { cache: 'no-store' });
    if (!res.ok) return null;
    const { email } = (await res.json()) as { email?: { emailOn?: unknown; emailTo?: unknown } | null };
    if (!email || typeof email.emailOn !== 'boolean') return null;
    return {
      emailOn: email.emailOn,
      emailTo: typeof email.emailTo === 'string' && email.emailTo ? email.emailTo : null,
    };
  } catch {
    return null;
  }
}

/**
 * "Email me when one appears" in Learn home's quiet third box: the switch Issues draws on its empty end, for the
 * person's list with "For you" on. It changes in place; on with no address, the line says where the address is set,
 * and the email is read again when the person comes back to the page (one read at a time, 30 seconds apart at least,
 * as Issues does), so the line changes in place once an address is there.
 */
export function HomeIssuesEmail({ on: givenOn, to: givenTo }: { on: boolean; to: string | null }) {
  const [email, setEmail] = useState<HomeEmail>({ emailOn: givenOn, emailTo: givenTo });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const turn = (next: boolean) =>
    start(async () => {
      setError(null);
      const result = await setLearnIssuesEmailAction(next, next ? 'FOR_YOU' : null).catch(() => null);
      if (!result) setError(learnSettingsErrorOf('FAILED'));
      else if (!result.ok) setError(learnSettingsErrorOf(result.error));
      else if (!result.data) setError(learnSettingsErrorOf('CLOSED'));
      else {
        const turned = result.data.newIssues;
        setEmail((was) => ({ ...was, emailOn: turned }));
      }
    });

  const state = issuesEmailStateOf(email);
  const waitsForAddress = state.kind === 'no-address';
  const addressRead = useRef({ reading: false, last: Number.NEGATIVE_INFINITY });
  useEffect(() => {
    if (!waitsForAddress) return;
    const again = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (addressRead.current.reading || now - addressRead.current.last < ADDRESS_READ_GAP_MS) return;
      addressRead.current = { reading: true, last: now };
      readHomeIssuesEmail().then((read) => {
        addressRead.current.reading = false;
        if (read) setEmail(read);
      });
    };
    window.addEventListener('focus', again);
    document.addEventListener('visibilitychange', again);
    return () => {
      window.removeEventListener('focus', again);
      document.removeEventListener('visibilitychange', again);
    };
  }, [waitsForAddress]);

  return (
    <div className="mt-auto" data-home-issues-email="">
      <IssuesEmail
        state={state}
        pending={pending}
        error={error}
        onTurnOn={() => turn(true)}
        onTurnOff={() => turn(false)}
      />
    </div>
  );
}
