'use client';

import { FairUseAppealForm } from './fair-use-appeal';
import { CONTACT_EMAIL } from '@/lib/legal';
import { appealFairUse } from '@/lib/workspace/fair-use.actions';
import type { FairUseAppeal } from '@/lib/workspace/masked-issue.types';

/**
 * Sends a request to look again at a closed access: the request as saved (or the one already open), or null when it was
 * not sent, which the form says. Pass it as the form's `onSend` wherever the form shows.
 */
export async function sendFairUseAppeal(text: string): Promise<FairUseAppeal | null> {
  const result = await appealFairUse(text).catch(() => null);
  return result?.ok ? result.data : null;
}

/**
 * A closed access with the request to look again wired: the closing words, the form, and the other way to ask, by
 * email. An API that does not take requests yet fails the send, and email is the way that is left.
 */
export function FairUseAppealLive({ appeal = null }: { appeal?: FairUseAppeal | null }) {
  return (
    <div className="flex flex-col gap-3" data-fair-use-appeal-live="">
      <FairUseAppealForm appeal={appeal} onSend={sendFairUseAppeal} />
      <p className="m-0 text-sm text-muted-foreground">
        You can also write to us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-link hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </div>
  );
}
