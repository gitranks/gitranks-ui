'use client';

import { useEffect, useState } from 'react';

import { readFixMine } from './answers-view';
import { FixStateView, githubPrActionOf } from './walkthrough-parts';
import { hasSessionHint } from '@/lib/session-hint';
import type { PrRef } from '@/lib/workspace/pr-feedback';

/**
 * A walkthrough the page cannot show: paused while reports on its questions are looked at, not public yet, or a read
 * that did not come. Said plainly, with the pull request on GitHub; the fixer, once their side is read, learns that
 * theirs is paused and that their answers and pull request are not affected.
 */
export function WalkthroughNotHere({ pr }: { pr: PrRef }) {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!hasSessionHint(document.cookie)) return;
    let live = true;
    readFixMine(pr).then(({ mine }) => {
      if (live) setHeld(!!mine?.held);
    });
    return () => {
      live = false;
    };
  }, [pr]);

  if (held) {
    return (
      <FixStateView
        state="paused"
        eyebrow="A fix walkthrough"
        title="This walkthrough is paused"
        lead="Readers reported a mistake in its questions, and we are checking them."
        action={githubPrActionOf(pr.nameWithOwner, pr.number)}
      >
        <p className="m-0 rounded-lg border bg-card px-4 py-3 text-sm" data-held-note="">
          This is the walkthrough of your fix. Your answers and your pull request are not affected.
        </p>
      </FixStateView>
    );
  }
  return (
    <FixStateView
      state="not-here"
      eyebrow="A fix walkthrough"
      title="This walkthrough is not open right now"
      lead="It may be paused while we check its questions. The pull request itself is on GitHub."
      action={githubPrActionOf(pr.nameWithOwner, pr.number)}
    />
  );
}
