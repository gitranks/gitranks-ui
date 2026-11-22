import type { HeroBoard, HeroSlot } from '../admin.types';
import { compact, day, full, gained, headsUpLine, recapLine, weekShort } from '../admin-copy';
import type { PressAction } from './press';
import { MailLineText, SlotActions, SlotName, SlotStatus } from './slot-parts';
import { Pill } from '@/components/pill/pill';

const EYEBROW = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase';

function WeekCard({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="flex min-w-64 flex-1 flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm dark:shadow-none">
      <span className={EYEBROW}>{title}</span>
      {children}
    </section>
  );
}

function SlotSummary({ slot }: Readonly<{ slot: HeroSlot }>) {
  const stars =
    slot.status === 'LIVE' && slot.starsAtStart !== null && slot.starsNow !== null
      ? `${gained(slot.starsNow - slot.starsAtStart)} stars since Monday`
      : null;
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <SlotName slot={slot} />
        <SlotStatus slot={slot} />
      </div>
      <span className="text-sm text-muted-foreground">{weekShort(slot)}</span>
      {stars && <p className="font-mono text-sm tabular-nums">{stars}</p>}
      <MailLineText line={headsUpLine(slot)} />
    </>
  );
}

/** The Live and Next cards: this week's hero, and next week's slot or the call to schedule one. */
export function WeekCards({ board }: Readonly<{ board: HeroBoard }>) {
  const next = board.upcoming.find((slot) => slot.week === board.nextWeek.week);
  return (
    <div className="flex flex-wrap gap-4">
      <WeekCard title="Live">
        {board.live.length ? (
          board.live.map((slot) => <SlotSummary key={slot.id} slot={slot} />)
        ) : (
          <p className="text-sm text-muted-foreground">No hero this week: the home page shows the Example rank card.</p>
        )}
      </WeekCard>
      <WeekCard title="Next">
        {next ? (
          <SlotSummary slot={next} />
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">Pick from the shortlist</span>
              <Pill>Empty</Pill>
            </div>
            <span className="text-sm text-muted-foreground">{weekShort(board.nextWeek)}</span>
            <p className="text-xs text-muted-foreground">
              Schedule one by {day(board.nextWeek.closesAt)} so the maintainer gets 4 days to opt out, or with no
              heads-up until the week starts.
            </p>
          </>
        )}
      </WeekCard>
    </div>
  );
}

/** Every week that holds a slot now: the live ones and the coming ones, soonest first, each with its actions. */
export function WeeksTable({
  board,
  action,
  pending,
}: Readonly<{ board: HeroBoard; action?: PressAction; pending?: boolean }>) {
  const slots = [...board.live, ...board.upcoming];
  return (
    <section className="flex flex-col rounded-xl border bg-card shadow-sm dark:shadow-none">
      <div className="flex flex-col gap-1 p-4">
        <h2 className="text-base font-semibold">Weeks</h2>
        <p className="text-sm text-muted-foreground">
          With the heads-up, scheduling for a week closes 97 hours before it starts, when the email goes out; once it
          may have reached the maintainer, the slot is locked. With no heads-up, a week can be scheduled until it starts
          and its slot cancelled until the week ends.
        </p>
      </div>
      {slots.length ? (
        <div className="relative overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-y">
                <th scope="col" className="px-4 py-2 text-left font-medium">
                  Week
                </th>
                <th scope="col" className="px-2 py-2 text-left font-medium">
                  Hero
                </th>
                <th scope="col" className="px-2 py-2 text-left font-medium">
                  State
                </th>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  Weekly downloads
                </th>
                <th scope="col" className="px-2 py-2 text-right font-medium">
                  Stars
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
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
                      <MailLineText line={headsUpLine(slot)} />
                      <MailLineText line={recapLine(slot)} />
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right font-mono tabular-nums">{compact(slot.facts.weeklyDownloads)}</td>
                  <td className="px-2 py-3 text-right font-mono tabular-nums">
                    {slot.starsAtStart === null ? '—' : full(slot.starsAtStart)}
                    {slot.status === 'LIVE' && slot.starsNow !== null && slot.starsAtStart !== null && (
                      <span className="block text-xs text-positive-strong">
                        {gained(slot.starsNow - slot.starsAtStart)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <SlotActions slot={slot} action={action} pending={pending} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 pb-4 text-sm text-muted-foreground">No week holds a slot yet.</p>
      )}
    </section>
  );
}
