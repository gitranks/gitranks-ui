'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { WALKTHROUGH_MAIN } from './walkthrough-parts';
import { Button } from '@/components/ui/button';
import { HEADING } from '@/components/workspace/primitives';
import { Box } from '@/components/workspace/status-box';

/**
 * While the fixer's agent writes the walkthrough, or rewrites it after a send-back or a report: what is happening, a
 * way to look again, and the way back to the pull request's page.
 */
export function FixerWaiting({ rewriting, back }: { rewriting: boolean; back: Route }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <main className={WALKTHROUGH_MAIN} data-walkthrough="waiting">
      <div className="flex max-w-2xl flex-col gap-4">
        <Box state={rewriting ? 'AGENT_REWRITING' : 'AGENT_WORKING'}>
          <h1 className={HEADING.card}>
            {rewriting ? 'Your agent is rewriting the walkthrough' : 'Your agent is writing the walkthrough'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {rewriting
              ? 'It writes new questions for the parts you sent back. When they pass our checks, the walkthrough opens here again.'
              : 'Nothing to do here yet. When the fix and its walkthrough pass our checks, the walkthrough opens on this page.'}{' '}
            Your agent tells you in the terminal too.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              className="max-sm:min-h-11"
              onClick={() => start(() => router.refresh())}
            >
              Look again
            </Button>
            <Button asChild variant="ghost" className="max-sm:min-h-11">
              <Link href={back} prefetch={false}>
                Back to your pull request
              </Link>
            </Button>
          </div>
        </Box>
      </div>
    </main>
  );
}
