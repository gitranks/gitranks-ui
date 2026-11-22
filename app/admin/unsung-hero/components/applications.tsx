import type { HeroApplicationCounts, HeroApplicationRow, HeroApplications, HeroCandidate } from '../admin.types';
import {
  applicationNameOf,
  applicationSlotTag,
  downloadsCell,
  full,
  notPickedConfirm,
  registryLabel,
  STATUS_TONE,
  stamp,
  usageOfRow,
} from '../admin-copy';
import { ConfirmPress } from './confirm-press';
import type { PressAction } from './press';
import { MissLabels } from './shortlist';
import { Link } from '@/components/link/link';
import { Pill } from '@/components/pill/pill';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getRepoPath } from '@/utils/repo-paths';

/**
 * An application as the Schedule dialog takes it: its repository, package, numbers, labels and the live check kept on
 * it. Null while there is nothing to schedule: a nomination we could not find, or no GitHub repository.
 */
export function scheduleSubjectOf(row: HeroApplicationRow): HeroCandidate | null {
  if (!row.repo || !row.package) return null;
  return {
    position: 0,
    repo: { githubId: row.repo.githubId, nameWithOwner: row.repo.nameWithOwner, createdAt: null },
    package: row.package,
    weeklyDownloads: 0,
    downloadsRank: 0,
    downloads: row.downloads ?? null,
    downloadsPer: row.downloadsPer ?? null,
    dependents: row.dependents,
    stars: row.stars ?? 0,
    pushedAt: null,
    owner: {
      githubId: row.owner?.githubId ?? '',
      login: row.owner?.login ?? row.repo.nameWithOwner.split('/')[0],
      type: row.owner?.type ?? 'User',
      followers: row.owner?.followers ?? null,
      hasEmail: !!row.owner?.hasEmail,
    },
    score: 0,
    misses: row.misses,
    liveCheck: row.liveCheck,
  };
}

/** Who sent it, and when: the owner of the repository, or a nomination. */
const byline = (row: HeroApplicationRow) =>
  `${row.applicant.owned ? `by ${row.applicant.login}, the owner` : `nominated by ${row.applicant.login}`} · ${stamp(row.sentAt)}`;

type RowsProps = {
  rows: HeroApplicationRow[];
  action?: PressAction;
  pending?: boolean;
  onSchedule?: (applicationId: string) => void;
  /** What the list says when it holds none. */
  empty: string;
};

/** One tab's applications: what each is for, who sent it, its labels and numbers; in review, Not picked and Schedule. */
function ApplicationRows({ rows, action, pending, onSchedule, empty }: Readonly<RowsProps>) {
  if (!rows.length) return <p className="px-4 pb-4 text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-y">
            <th scope="col" className="px-4 py-2 text-left font-medium">
              Package
            </th>
            <th scope="col" className="px-2 py-2 text-left font-medium">
              Note
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Stars
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Downloads
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Used by (100+★)
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Owner followers
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const inReview = row.status === 'IN_REVIEW';
            const schedulable = inReview && !!scheduleSubjectOf(row);
            const name = applicationNameOf(row);
            return (
              <tr key={row.id} className="border-b align-top last:border-0 hover:bg-accent/60">
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      {row.repo ? (
                        <Link
                          href={getRepoPath(row.repo.nameWithOwner)}
                          className="font-medium text-foreground no-underline hover:underline"
                        >
                          {row.repo.nameWithOwner}
                        </Link>
                      ) : (
                        <span className="font-medium break-all">{name}</span>
                      )}
                      {row.package && <Pill size="small">{registryLabel(row.package.registry)}</Pill>}
                    </span>
                    <span className="text-xs text-muted-foreground break-all">
                      {row.package && row.repo ? `${row.package.displayName ?? row.package.name} · ` : ''}
                      {byline(row)}
                    </span>
                    {row.typed && (row.package || row.repo) && (
                      <span className="text-xs text-muted-foreground break-all">Typed: {row.typed}</span>
                    )}
                    {row.status === 'SCHEDULING' && (
                      <div className="flex flex-wrap gap-1">
                        <Pill tone="violet">Scheduling…</Pill>
                      </div>
                    )}
                    {row.slot && (
                      <div className="flex flex-wrap gap-1">
                        <Pill tone={STATUS_TONE[row.slot.status]}>{applicationSlotTag(row.slot)}</Pill>
                      </div>
                    )}
                    {row.status === 'NOT_PICKED' && row.decidedAt && (
                      <span className="text-xs text-muted-foreground">
                        Not picked {stamp(row.decidedAt)}
                        {row.decidedBy ? ` by ${row.decidedBy}` : ''}
                      </span>
                    )}
                    {inReview &&
                      (row.misses.length ? (
                        <MissLabels misses={row.misses} />
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          <Pill tone="green">Meets the rules</Pill>
                        </div>
                      ))}
                  </div>
                </td>
                <td className="max-w-64 px-2 py-3 break-words text-muted-foreground">{row.note ?? '—'}</td>
                <td className="px-2 py-3 text-right font-mono tabular-nums">{full(row.stars)}</td>
                <td className="whitespace-nowrap px-2 py-3 text-right font-mono tabular-nums">
                  {downloadsCell(usageOfRow(row))}
                </td>
                <td className="px-2 py-3 text-right font-mono tabular-nums text-muted-foreground">
                  {full(row.dependents)}
                </td>
                <td className="px-2 py-3 text-right font-mono tabular-nums">{full(row.owner?.followers)}</td>
                <td className="px-4 py-3">
                  {inReview && (
                    <div className="flex justify-end gap-2">
                      <ConfirmPress
                        action={action}
                        pending={pending}
                        intent="not-picked"
                        fields={{ id: row.id }}
                        variant="ghost"
                        label="Not picked"
                        copy={notPickedConfirm(name)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending || !schedulable}
                        title={schedulable ? undefined : 'Nothing to schedule: no package or GitHub repository found'}
                        onClick={() => onSchedule?.(row.id)}
                      >
                        Schedule
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Applications sent from the apply page, in three tabs: In review (oldest first), Scheduled and Not picked. A cancel by
 * the applicant removes the application, so there is no tab for it.
 */
export function ApplicationsTable({
  applications,
  counts,
  action,
  pending,
  onSchedule,
}: Readonly<{
  applications: HeroApplications;
  counts: HeroApplicationCounts;
  action?: PressAction;
  pending?: boolean;
  onSchedule?: (applicationId: string) => void;
}>) {
  const rowProps = { action, pending, onSchedule };
  return (
    <section className="flex flex-col rounded-xl border bg-card shadow-sm dark:shadow-none">
      <div className="flex flex-col gap-1 p-4">
        <h2 className="text-base font-semibold">Applications</h2>
        <p className="text-sm text-muted-foreground">
          Sent from the apply page, oldest first. Labels are our checks as of the send (the applicant never sees them).
          Schedule opens the same dialog and live check as the Shortlist; scheduling marks the application Scheduled and
          emails the applicant. Not picked tells the applicant on their page (no email); they may send a new one.
          Applicants can cancel only while it is in review, which removes it.
        </p>
      </div>
      <Tabs defaultValue="in-review" className="gap-0">
        <div className="px-4 pb-3">
          <TabsList aria-label="Applications by status">
            <TabsTrigger value="in-review">
              In review <span className="tabular-nums text-muted-foreground">{counts.inReview}</span>
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              Scheduled <span className="tabular-nums text-muted-foreground">{counts.scheduled}</span>
            </TabsTrigger>
            <TabsTrigger value="not-picked">
              Not picked <span className="tabular-nums text-muted-foreground">{counts.notPicked}</span>
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="in-review">
          <ApplicationRows rows={applications.inReview} {...rowProps} empty="No applications in review." />
        </TabsContent>
        <TabsContent value="scheduled">
          <ApplicationRows rows={applications.scheduled} {...rowProps} empty="No scheduled applications." />
        </TabsContent>
        <TabsContent value="not-picked">
          <ApplicationRows rows={applications.notPicked} {...rowProps} empty="No applications marked not picked." />
        </TabsContent>
      </Tabs>
    </section>
  );
}
