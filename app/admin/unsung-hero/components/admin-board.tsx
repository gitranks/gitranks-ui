import type { ReactNode } from 'react';

import type { AdminNotice, AdminState } from '../admin-state';
import { OptOutsTable, PastTable } from './past';
import type { PressAction } from './press';
import { ShortlistTable } from './shortlist';
import { WeekCards, WeeksTable } from './weeks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const NOTICE_TONE: Record<AdminNotice['tone'], string> = {
  done: 'bg-positive/10 text-positive-strong',
  refused: 'bg-warning-soft text-warning-soft-foreground',
  failed: 'bg-negative/10 text-negative-strong',
};

/** What the last press did, at the top of the board. A live check's answer shows in the Schedule dialog instead. */
function BoardNotice({ notice }: Readonly<{ notice: AdminNotice | null }>) {
  if (!notice || notice.intent === 'live-check') return null;
  if (notice.intent === 'schedule' && notice.tone !== 'done') return null;
  return (
    <p role="status" className={cn('rounded-md px-3 py-2 text-sm', NOTICE_TONE[notice.tone])}>
      {notice.text}
    </p>
  );
}

/**
 * The owner's Unsung hero board: the Live and Next cards, the weeks with their slots and actions, and the tabs
 * Shortlist, Past heroes and Opt-outs. Drawn from the board alone; `action` is the one server action every button
 * posts to.
 */
export function AdminBoard({
  state,
  action,
  pending,
  onSchedule,
  dialog,
}: Readonly<{
  state: AdminState;
  action?: PressAction;
  pending?: boolean;
  onSchedule?: (repoGithubId: string) => void;
  dialog?: ReactNode;
}>) {
  const { board } = state;
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-4">
      <Tabs defaultValue="shortlist" className="gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Admin</span>
            <h1 className="text-3xl font-semibold tracking-tight">Unsung hero</h1>
          </div>
          <TabsList>
            <TabsTrigger value="shortlist">Shortlist</TabsTrigger>
            <TabsTrigger value="past">Past heroes</TabsTrigger>
            <TabsTrigger value="opt-outs">Opt-outs</TabsTrigger>
          </TabsList>
        </div>
        {board.preview && (
          <p className="rounded-md bg-brand-soft px-3 py-2 text-sm text-brand-soft-foreground">
            Before launch: every slot scheduled now is a preview. Both its emails go to you, no maintainer is written
            to, and it holds no real week.
          </p>
        )}
        <BoardNotice notice={state.notice} />
        <WeekCards board={board} />
        <WeeksTable board={board} action={action} pending={pending} />
        <TabsContent value="shortlist">
          <ShortlistTable
            shortlist={board.shortlist}
            builtAt={board.shortlistBuiltAt}
            action={action}
            pending={pending}
            onSchedule={onSchedule}
          />
        </TabsContent>
        <TabsContent value="past">
          <PastTable past={board.past} action={action} pending={pending} />
        </TabsContent>
        <TabsContent value="opt-outs">
          <OptOutsTable optOuts={board.optOuts} />
        </TabsContent>
      </Tabs>
      {dialog}
    </main>
  );
}
