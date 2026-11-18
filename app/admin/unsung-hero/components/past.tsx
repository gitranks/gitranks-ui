import type { HeroOptOut, HeroSlot } from '../admin.types';
import { cancelReasonText, compact, day, full, gained, headsUpLine, recapLine, stamp, weekShort } from '../admin-copy';
import type { PressAction } from './press';
import { MailLineText, SlotActions, SlotName, SlotStatus } from './slot-parts';

function Why({ slot }: Readonly<{ slot: HeroSlot }>) {
  if (slot.status === 'CANCELLED')
    return <p className="text-xs text-muted-foreground">{cancelReasonText(slot.cancelledReason)}</p>;
  if (slot.status === 'OPTED_OUT' && slot.optedOutAt) {
    return <p className="text-xs text-muted-foreground">Opted out {stamp(slot.optedOutAt)}</p>;
  }
  return null;
}

/** Ended, opted-out and cancelled slots, newest week first: how each week went, or why it did not. */
export function PastTable({
  past,
  action,
  pending,
}: Readonly<{ past: HeroSlot[]; action?: PressAction; pending?: boolean }>) {
  if (!past.length) return <p className="p-4 text-sm text-muted-foreground">No past heroes yet.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm dark:shadow-none">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b">
            <th scope="col" className="px-4 py-2 text-left font-medium">
              Week
            </th>
            <th scope="col" className="px-2 py-2 text-left font-medium">
              Hero
            </th>
            <th scope="col" className="px-2 py-2 text-left font-medium">
              Outcome
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Weekly downloads
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Stars when featured
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              That week
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Now
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Visits
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              Clicks to GitHub
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {past.map((slot) => (
            <tr key={slot.id} className="border-b align-top last:border-0">
              <td className="whitespace-nowrap px-4 py-3">
                <div className="flex flex-col">
                  <span>{weekShort(slot)}</span>
                  <span className="text-xs text-muted-foreground">{slot.week}</span>
                </div>
              </td>
              <td className="px-2 py-3">
                <SlotName slot={slot} />
              </td>
              <td className="px-2 py-3">
                <div className="flex flex-col items-start gap-1">
                  <SlotStatus slot={slot} />
                  <Why slot={slot} />
                  <MailLineText line={headsUpLine(slot)} />
                  <MailLineText line={recapLine(slot)} />
                </div>
              </td>
              <td className="px-2 py-3 text-right font-mono tabular-nums">{compact(slot.facts.weeklyDownloads)}</td>
              <td className="px-2 py-3 text-right font-mono tabular-nums">{full(slot.starsAtStart)}</td>
              <td className="px-2 py-3 text-right font-mono tabular-nums text-positive-strong">
                {gained(slot.starsGained)}
              </td>
              <td className="px-2 py-3 text-right font-mono tabular-nums">{full(slot.starsNow)}</td>
              <td className="px-2 py-3 text-right font-mono tabular-nums">{full(slot.visits)}</td>
              <td className="px-2 py-3 text-right font-mono tabular-nums">{full(slot.githubClicks)}</td>
              <td className="px-4 py-3">
                <SlotActions slot={slot} action={action} pending={pending} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Maintainers who opted out: never asked again, whatever the repository. */
export function OptOutsTable({ optOuts }: Readonly<{ optOuts: HeroOptOut[] }>) {
  if (!optOuts.length) return <p className="p-4 text-sm text-muted-foreground">Nobody has opted out.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm dark:shadow-none">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b">
            <th scope="col" className="px-4 py-2 text-left font-medium">
              Maintainer
            </th>
            <th scope="col" className="px-4 py-2 text-left font-medium">
              Opted out
            </th>
          </tr>
        </thead>
        <tbody>
          {optOuts.map((optOut) => (
            <tr key={optOut.maintainerGithubId} className="border-b last:border-0">
              <td className="px-4 py-3 font-medium">{optOut.login}</td>
              <td className="px-4 py-3 text-muted-foreground">{day(optOut.at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
