'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import {
  ApproveScreen,
  type ApproveScreenProps,
  type ApproveSend,
} from '@/components/workspace/pr-parts/approve-screen';
import { useGrantGithub } from '@/components/workspace/use-grant-github';
import { sendBackToAgent } from '@/lib/workspace/actions';
import { attemptActionErrorMessage, type ContributeActionResult } from '@/lib/workspace/errors';
import { RESUME_PARAM, savePendingApproval, tabStoreOf, takePendingApproval } from '@/lib/workspace/grant-resume';
import { requestKeyOf } from '@/lib/workspace/one-comment';
import { sendPullRequestAction } from '@/lib/workspace/pull-request.actions';
import type { PullRequestRefInput } from '@/lib/workspace/pull-request.documents';

/**
 * Approve and send, with its calls: the send (after GitHub's permission when it is not there yet: what the person
 * approved waits in the tab while GitHub asks, and is sent once they are back), and "Send it back to your agent". A send
 * that went through opens the pull request's page.
 */
export function ApproveView({
  refInput,
  attemptId,
  page,
  approvePath,
  resume,
  sendBack,
  ...screen
}: Omit<ApproveScreenProps, 'state' | 'onSend' | 'onSendBack'> & {
  refInput: PullRequestRefInput;
  attemptId: string;
  /** The pull request's page, where a send or a send-back leads. */
  page: Route;
  approvePath: Route;
  /** `?resume=`: back from GitHub's permission, with the key of what waits in the tab. */
  resume: string | null;
  /** The person's own agent made the change: it can be sent back to it. */
  sendBack: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<'ready' | 'sending' | 'failed'>('ready');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const grant = useGrantGithub(approvePath);
  const resumed = useRef(false);

  const call = (run: () => Promise<ContributeActionResult<unknown>>) =>
    startTransition(async () => {
      setError(null);
      setState('sending');
      const result = await run();
      if (result.ok) {
        router.push(page);
        return;
      }
      setState(result.error === 'FAILED' ? 'failed' : 'ready');
      if (result.error !== 'FAILED') setError(attemptActionErrorMessage(result.error, result.message));
    });

  const send = (approved: ApproveSend) => {
    if (!screen.approval.githubAllowed) {
      const nonce = requestKeyOf();
      const kept = savePendingApproval(tabStoreOf(globalThis.window), {
        attemptId,
        title: approved.title,
        body: approved.description,
        dco: approved.signOff,
        nonce,
      });
      // The way back is Approve again, with the key of what waits in the tab. A tab that keeps nothing sends as it
      // is: the API says when the permission is missing.
      if (kept) return grant.grant(`${approvePath}?${new URLSearchParams({ [RESUME_PARAM]: nonce })}` as Route);
    }
    call(() => sendPullRequestAction(refInput, approved));
  };

  // GitHub's screen comes back here: what waited in the tab is sent once.
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, as the page opens.
  useEffect(() => {
    if (resumed.current || !resume) return;
    resumed.current = true;
    const waiting = takePendingApproval(tabStoreOf(globalThis.window), attemptId, resume);
    if (waiting) {
      call(() =>
        sendPullRequestAction(refInput, { title: waiting.title, description: waiting.body, signOff: waiting.dco }),
      );
    }
  }, []);

  return (
    <>
      {error ? (
        <p role="alert" className="m-0 text-sm text-destructive" data-approve-error="">
          {error}
        </p>
      ) : null}
      <ApproveScreen
        {...screen}
        state={pending || grant.pending ? 'sending' : state}
        onSend={send}
        onSendBack={sendBack ? (note) => call(() => sendBackToAgent(attemptId, note)) : undefined}
      />
    </>
  );
}
