'use client';

import { useState } from 'react';
import { FaGithub } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import { signInBackHere } from '@/components/workspace/getting-in/flow-sign-in';
import { contributeSource } from '@/lib/workspace/click-tracking';

/**
 * Under a visitor's short list: how many it shows of about how many there are, and Sign in with GitHub to see all,
 * which comes back to this address with the goal in it (the goal is then saved, and the person's own list shows).
 */
export function SeeAllIssues({ shown, total }: { shown: number; total: number }) {
  const [pending, setPending] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground" data-see-all="">
      <span>
        {total > shown
          ? `Showing ${shown} of about ${total.toLocaleString('en-US')} issues`
          : `Showing ${shown} ${shown === 1 ? 'issue' : 'issues'}`}
      </span>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        className="min-h-10 gap-2 px-4 font-semibold max-sm:min-h-11 max-sm:w-full"
        data-sign-in="flow"
        {...contributeSource('learn_flow_more')}
        onClick={() => {
          setPending(true);
          signInBackHere().catch(() => setPending(false));
        }}
      >
        <FaGithub aria-hidden="true" className="size-4" />
        Sign in with GitHub to see all
      </Button>
    </div>
  );
}
