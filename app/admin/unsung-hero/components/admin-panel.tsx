'use client';

import { useActionState, useEffect, useState } from 'react';

import { pressAdmin } from '../actions';
import type { AdminState } from '../admin-state';
import { weekOptionsOf } from '../admin-weeks';
import { AdminBoard } from './admin-board';
import { scheduleSubjectOf } from './applications';
import { ScheduleDialog } from './schedule-dialog';

/** What Schedule was pressed on: a shortlist row by its repository, or an application by its id. */
type Scheduling = { kind: 'candidate'; repoGithubId: string } | { kind: 'application'; id: string };

/** The candidate the dialog works on, and the application it schedules from, if any. */
function subjectOf(state: AdminState, scheduling: Scheduling | null) {
  if (!scheduling) return null;
  if (scheduling.kind === 'candidate') {
    const candidate = state.board.shortlist.find((row) => row.repo.githubId === scheduling.repoGithubId);
    return candidate ? { candidate, applicationId: null } : null;
  }
  const row = state.board.applications?.inReview.find((each) => each.id === scheduling.id);
  const candidate = row && row.status === 'IN_REVIEW' ? scheduleSubjectOf(row) : null;
  return candidate ? { candidate, applicationId: scheduling.id } : null;
}

/** The board in the browser: what the page read, then what each press answered; and the Schedule dialog. */
export function AdminPanel({ initial }: Readonly<{ initial: AdminState }>) {
  const [state, action, pending] = useActionState(pressAdmin, initial);
  const [scheduling, setScheduling] = useState<Scheduling | null>(null);
  // The state when the dialog opened: a notice from before it belongs to another press.
  const [openedWith, setOpenedWith] = useState<AdminState | null>(null);

  // A slot was scheduled: the dialog has done its job.
  useEffect(() => {
    if (state.notice?.intent === 'schedule' && state.notice.tone === 'done') setScheduling(null);
  }, [state]);

  const subject = subjectOf(state, scheduling);
  const candidate = subject?.candidate;
  const applicationId = subject?.applicationId ?? null;
  const sameCheck =
    !!candidate &&
    state.check?.repoGithubId === candidate.repo.githubId &&
    (state.check.applicationId ?? null) === applicationId;
  const dialog = candidate ? (
    <ScheduleDialog
      key={`${candidate.repo.githubId}-${applicationId ?? ''}`}
      candidate={candidate}
      applicationId={applicationId}
      lastCheck={sameCheck ? state.check : null}
      notice={state === openedWith ? null : state.notice}
      weeks={weekOptionsOf(state.board)}
      weeksWithoutHeadsUp={weekOptionsOf(state.board, { headsUp: false })}
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
        setScheduling({ kind: 'candidate', repoGithubId });
      }}
      onScheduleApplication={(id) => {
        setOpenedWith(state);
        setScheduling({ kind: 'application', id });
      }}
      dialog={dialog}
    />
  );
}
