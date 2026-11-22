'use client';

import { useState } from 'react';

import type { HeroCandidate, HeroLiveCheck } from '../admin.types';
import {
  compact,
  full,
  LINE_MAX,
  monthYear,
  REASON_MAX,
  refusalText,
  repoNameOf,
  stamp,
  TEXT_MAX,
  weekdayDate,
} from '../admin-copy';
import type { AdminCheck, AdminNotice } from '../admin-state';
import type { WeekOption } from '../admin-weeks';
import type { PressAction } from './press';
import { MissLabels } from './shortlist';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const yesNo = (value: boolean | null, yes: string, no: string, unknown = 'Not known') =>
  value === null ? unknown : value ? yes : no;

/** What the live check read, line by line. */
export function CheckFacts({ check }: Readonly<{ check: HeroLiveCheck }>) {
  if (check.outcome !== 'FOUND') {
    return (
      <p className="text-sm">{refusalText(check.outcome === 'MISSING' ? 'REPOSITORY_GONE' : 'GITHUB_UNAVAILABLE')}</p>
    );
  }
  const advisories = check.advisories.length
    ? `Open: ${check.advisories.join(', ')}`
    : check.advisoriesIncomplete
      ? 'None read, but GitHub lists more than were read'
      : 'None open';
  const rows: [string, string][] = [
    ['Repository', check.nameWithOwner ?? '—'],
    ['Stars on GitHub', full(check.githubStars)],
    ['Owner', `${check.ownerLogin ?? '—'} (${check.ownerType ?? 'unknown'}), ${full(check.ownerFollowers)} followers`],
    ['Public email', check.hasEmail ? 'Yes' : 'No'],
    ['License', check.licenseSpdx ?? 'None'],
    ['Last push', monthYear(check.pushedAt)],
    [
      'Fork, archived',
      `${yesNo(check.isFork, 'Fork', 'Not a fork')}, ${yesNo(check.isArchived, 'archived', 'not archived', 'not known')}`,
    ],
    ['Security advisories', advisories],
    [
      'GitHub links the package',
      check.lookupAnswered ? yesNo(check.linked, 'Yes', 'No') : 'The package lookup did not answer',
    ],
    ['Weekly downloads', compact(check.weeklyDownloads)],
    ['Used by (100+★)', full(check.dependents)],
    ['Opted out before', check.optedOut ? 'Yes' : 'No'],
  ];
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The heads-up as the maintainer will read it, with the numbers of the live check. */
export function HeadsUpPreview({
  candidate,
  check,
  startsAt,
  reason,
}: Readonly<{ candidate: HeroCandidate; check: HeroLiveCheck | null; startsAt: string | null; reason: string }>) {
  const name = repoNameOf(check?.nameWithOwner ?? candidate.repo.nameWithOwner);
  const downloads = compact(check?.weeklyDownloads ?? candidate.weeklyDownloads);
  const stars = full(check?.githubStars ?? candidate.stars);
  const why = reason.trim()
    ? `${downloads} downloads a week, ${reason.trim()}, and ${stars} stars`
    : `${downloads} downloads a week and ${stars} stars`;
  const greeting = check?.firstName ?? check?.ownerLogin ?? candidate.owner.login;
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3 text-sm">
      <p className="font-medium">{name} is our Unsung hero next week</p>
      <p>Hi {greeting},</p>
      <p>
        From {startsAt ? weekdayDate(startsAt) : 'Monday'}, GitRanks will feature {name} on its home page for a week, as
        our Unsung hero.
      </p>
      <p>
        We picked it because so much depends on it: {why}. Visitors will see what it does and a link to star it on
        GitHub.
      </p>
      <p className="text-xs text-muted-foreground">The email reads the numbers again when it goes out.</p>
    </div>
  );
}

function Counted({ value, max }: Readonly<{ value: string; max: number }>) {
  const over = value.trim().length > max;
  return (
    <span className={cn('text-xs tabular-nums', over ? 'text-destructive' : 'text-muted-foreground')}>
      {value.trim().length}/{max}
    </span>
  );
}

/** What a press inside the dialog answered, unless it went through. */
function DialogNotice({ notice }: Readonly<{ notice: AdminNotice | null }>) {
  if (!notice || notice.tone === 'done') return null;
  return (
    <p role="alert" className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
      {notice.text}
    </p>
  );
}

const firstFreeOf = (options: WeekOption[]): string => options.find((option) => !option.taken)?.week ?? '';

/**
 * Schedule: a live check of the repository and package first (a press), then the week and the words, and the heads-up
 * as it will read. The heads-up can be turned off: then the weeks inside its 97 hours are offered too, no public email
 * is needed, and the maintainer gets no email before the week and no chance to opt out. Schedule stays off until the
 * check answers nothing that stops it for that choice; the API checks it all again.
 */
export function ScheduleDialog({
  candidate,
  lastCheck,
  notice,
  weeks,
  weeksWithoutHeadsUp,
  action,
  pending,
  onClose,
}: Readonly<{
  candidate: HeroCandidate;
  /** This page's last live check of the candidate, if any: it alone greets the maintainer by name. */
  lastCheck: AdminCheck | null;
  notice: AdminNotice | null;
  /** The weeks open with the heads-up, and with none (from next week on). */
  weeks: WeekOption[];
  weeksWithoutHeadsUp: WeekOption[];
  action?: PressAction;
  pending?: boolean;
  onClose: () => void;
}>) {
  const check = lastCheck?.check ?? candidate.liveCheck;
  const [packageName, setPackageName] = useState(check?.package.name ?? candidate.package.name);
  const [headsUp, setHeadsUp] = useState(true);
  const [week, setWeek] = useState(firstFreeOf(weeks));
  const [line, setLine] = useState('');
  const [reason, setReason] = useState('');
  const [text, setText] = useState('');

  const offered = headsUp ? weeks : weeksWithoutHeadsUp;
  const option = offered.find((each) => each.week === week) ?? null;
  const refusals = check ? (headsUp ? check.refusals : check.refusalsWithoutHeadsUp) : [];
  const chooseHeadsUp = (on: boolean) => {
    setHeadsUp(on);
    const next = on ? weeks : weeksWithoutHeadsUp;
    if (!next.some((each) => each.week === week && !each.taken)) setWeek(firstFreeOf(next));
  };
  const ready =
    !!check &&
    refusals.length === 0 &&
    !!option &&
    !option.taken &&
    line.trim().length > 0 &&
    line.trim().length <= LINE_MAX &&
    (!headsUp || reason.trim().length <= REASON_MAX) &&
    text.trim().length > 0 &&
    text.trim().length <= TEXT_MAX;
  const dialogNotice = notice && (notice.intent === 'live-check' || notice.intent === 'schedule') ? notice : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Schedule {candidate.repo.nameWithOwner}</DialogTitle>
          <DialogDescription>
            A live check reads GitHub and the package now. Schedule needs one under 10 minutes old.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="intent" value="live-check" />
          <input type="hidden" name="repoGithubId" value={candidate.repo.githubId} />
          <div className="flex min-w-48 flex-1 flex-col gap-1.5">
            <Label htmlFor="hero-package">Package</Label>
            <Input
              id="hero-package"
              name="packageName"
              value={packageName}
              onChange={(event) => setPackageName(event.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            {check ? 'Check again' : 'Live check'}
          </Button>
        </form>

        <DialogNotice notice={dialogNotice} />

        {check ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              Checked {stamp(check.at)} for {check.package.name}
            </p>
            <CheckFacts check={check} />
            <MissLabels
              misses={
                headsUp
                  ? check.misses
                  : check.misses.map((miss) => (miss.code === 'NO_EMAIL' ? { ...miss, blocks: false } : miss))
              }
            />
            {refusals.length > 0 && (
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-destructive">
                {refusals.map((refusal) => (
                  <li key={refusal}>{refusalText(refusal)}</li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No live check yet.</p>
        )}

        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="intent" value="schedule" />
          <input type="hidden" name="repoGithubId" value={candidate.repo.githubId} />
          <input type="hidden" name="name" value={check?.package.name ?? candidate.package.name} />
          <input type="hidden" name="headsUp" value={headsUp ? 'true' : 'false'} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hero-heads-up" className="font-normal">
              <Checkbox
                id="hero-heads-up"
                checked={headsUp}
                onCheckedChange={(value) => chooseHeadsUp(value === true)}
              />
              Send the heads-up email
            </Label>
            {!headsUp && (
              <p className="text-sm text-muted-foreground">
                No heads-up: the maintainer gets no email before the week and no chance to opt out. Any week that has
                not started can be scheduled, and no public email is needed.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hero-week">Week</Label>
            <Select name="week" value={week} onValueChange={setWeek}>
              <SelectTrigger id="hero-week" className="w-full">
                <SelectValue placeholder="No week free">{option ? option.label : undefined}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {offered.map((each) => (
                  <SelectItem key={each.week} value={each.week} disabled={each.taken}>
                    {each.label}
                    {each.taken ? ' · taken' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="hero-line">The card’s line</Label>
              <Counted value={line} max={LINE_MAX} />
            </div>
            <Input
              id="hero-line"
              name="line"
              value={line}
              placeholder="Ships inside @scope/dialog"
              onChange={(event) => setLine(event.target.value)}
            />
          </div>
          {headsUp && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="hero-reason">The heads-up’s reason (optional)</Label>
                <Counted value={reason} max={REASON_MAX} />
              </div>
              <Input
                id="hero-reason"
                name="reason"
                value={reason}
                placeholder="inside @scope/dialog"
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="hero-text">The archive’s text</Label>
              <Counted value={text} max={TEXT_MAX} />
            </div>
            <Textarea
              id="hero-text"
              name="text"
              rows={4}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
          {headsUp && (
            <HeadsUpPreview candidate={candidate} check={check} startsAt={option?.startsAt ?? null} reason={reason} />
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" disabled={!ready || pending}>
              Schedule
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
