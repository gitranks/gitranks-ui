'use client';

import { useActionState, useEffect, useState } from 'react';

import { pressAdmin } from '../actions';
import type { AdminState } from '../admin-state';
import { weekOptionsOf } from '../admin-weeks';
import { AdminBoard } from './admin-board';
import { ScheduleDialog } from './schedule-dialog';

/** The board in the browser: what the page read, then what each press answered; and the Schedule dialog. */
export function AdminPanel({ initial }: Readonly<{ initial: AdminState }>) {
  const [state, action, pending] = useActionState(pressAdmin, initial);
  const [scheduling, setScheduling] = useState<string | null>(null);
  // The state when the dialog opened: a notice from before it belongs to another press.
  const [openedWith, setOpenedWith] = useState<AdminState | null>(null);

  // A slot was scheduled: the dialog has done its job.
  useEffect(() => {
    if (state.notice?.intent === 'schedule' && state.notice.tone === 'done') setScheduling(null);
  }, [state]);

  const candidate = scheduling ? state.board.shortlist.find((row) => row.repo.githubId === scheduling) : undefined;
  const dialog = candidate ? (
    <ScheduleDialog
      key={candidate.repo.githubId}
      candidate={candidate}
      lastCheck={state.check?.repoGithubId === candidate.repo.githubId ? state.check : null}
      notice={state === openedWith ? null : state.notice}
      weeks={weekOptionsOf(state.board)}
      weeksWithoutHeadsUp={weekOptionsOf(state.board, { headsUp: false })}
      preview={state.board.preview}
      action={action}
      pending={pending}
      onClose={() => setScheduling(null)}
    />
  ) : null;

  return (
    <AdminBoard
      state={state}
      action={action}
      pending={pending}
      onSchedule={(repoGithubId) => {
        setOpenedWith(state);
        setScheduling(repoGithubId);
      }}
      dialog={dialog}
    />
  );
}
