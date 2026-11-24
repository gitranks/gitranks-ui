import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { FixChangeCard } from './fix-frame';
import { Button } from '@/components/ui/button';
import { Rail } from '@/components/workspace/timeline-rail';
import { reportPathOf } from '@/lib/workspace/pr-feedback';
import type { PrTimeline, PrTimelineHelped } from '@/lib/workspace/pr-timeline.types';
import { fixChangeOf, helpedMoreOf, type MadeRow } from '@/lib/workspace/pr-timeline-made';

/*
 * "How it was made" (page 12, board B): a pull request's public page as a short list of what happened, then the
 * change and the notes for the project's maintainers. The same for everyone: it reads no session. A Learn fix adds
 * its part above the list (`learn`), which the page hands in.
 */

/** A row of the list: the label and the date on the left, the rail, a sentence and a quiet note. */
const MADE_ROW = 'group/row grid grid-cols-[5.5rem_1rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[7rem_1rem_minmax(0,1fr)]';

function MadeList({ rows }: { rows: readonly MadeRow[] }) {
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {rows.map((row, index) => (
        <li key={`${row.kind}-${row.at}-${index}`} className={MADE_ROW} data-made={row.kind}>
          <span className="flex flex-col items-end pt-0.5 text-right">
            <span className="text-sm font-semibold">{row.label}</span>
            <time dateTime={row.at} className="text-xs text-muted-foreground">
              {row.date}
            </time>
          </span>
          <Rail dot={row.dot} />
          <div className="flex min-w-0 flex-col gap-1 pb-6">
            <p className="m-0 text-sm break-words">{row.text}</p>
            {row.note ? <p className="m-0 text-sm break-words text-muted-foreground">{row.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** "7 people said it helped": how many said so, named or not. */
function HelpedCount({ count }: { count: number }) {
  return (
    <span className="text-sm" data-helped="">
      <span className="font-mono font-semibold tabular-nums">{count.toLocaleString('en-US')}</span>{' '}
      <span className="text-muted-foreground">{count === 1 ? 'person said it helped' : 'people said it helped'}</span>
    </span>
  );
}

/**
 * Who said it helped: the letter of each named login, its first character, a small round mark that opens the
 * person's profile, and "+N more" for the rest. When more said so than are named, the count leads, so no note is lost.
 */
function HelpedPeople({ helped, count }: { helped: PrTimelineHelped | null; count: number }) {
  if (helped?.helpedBy.length) {
    const all = Math.max(count, helped.helpedNamed);
    const more = helpedMoreOf({ names: helped.helpedBy, named: all });
    return (
      <div className="flex flex-wrap items-center gap-2" data-helped-by="">
        {all > helped.helpedNamed ? (
          <HelpedCount count={all} />
        ) : (
          <span className="text-sm text-muted-foreground">Said it helped</span>
        )}
        <ul className="m-0 flex list-none gap-1 p-0">
          {helped.helpedBy.map((login) => (
            <li key={login}>
              <Link
                href={`/profile/${encodeURIComponent(login)}` as Route}
                prefetch={false}
                title={login}
                aria-label={login}
                className="flex size-7 items-center justify-center rounded-full bg-brand-soft font-mono text-xs font-semibold text-brand-soft-foreground uppercase hover:ring-2 hover:ring-primary/40"
              >
                {login[0]}
              </Link>
            </li>
          ))}
        </ul>
        {more ? <span className="text-sm text-muted-foreground">{more}</span> : null}
      </div>
    );
  }
  return count > 0 ? <HelpedCount count={count} /> : null;
}

export type MaintainerLinks = {
  /** "Set rules for your project, or opt out": the page for maintainers, about this pull request. */
  rules: Route;
  /** "What a GitRanks Learn pull request is", or Contribute's. */
  about: { text: string; href: Route };
};

/** The notes for the project's maintainers: "helped", a report, who said it helped, and their rules. */
function ForMaintainers({
  timeline,
  helped,
  links,
}: {
  timeline: PrTimeline;
  helped: PrTimelineHelped | null;
  links: MaintainerLinks;
}) {
  const from = { from: timeline.attemptId };
  const who = timeline.contributorLogin ?? 'the contributor';
  return (
    <section
      className="flex flex-col gap-3 rounded-xl border bg-card p-5"
      aria-labelledby="fix-maintainers"
      data-fix-maintainers=""
    >
      <h2 id="fix-maintainers" className="m-0 text-base font-semibold">
        For the project’s maintainers
      </h2>
      <p className="m-0 text-sm text-muted-foreground">
        Was this pull request useful to your project? A “helped” note goes to {who}. A report goes to GitRanks only.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={reportPathOf(from, 'helped')} prefetch={false}>
            This pull request helped
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={reportPathOf(from)} prefetch={false}>
            Report this pull request
          </Link>
        </Button>
      </div>
      <HelpedPeople helped={helped} count={timeline.helped} />
      <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-sm">
        <Link href={links.rules} prefetch={false} className="font-medium text-link hover:underline">
          Set rules for your project, or opt out
        </Link>
        <Link href={links.about.href} prefetch={false} className="font-medium text-link hover:underline">
          {links.about.text}
        </Link>
      </p>
    </section>
  );
}

/**
 * The part of "How it was made" under the issue card: a Learn fix's own part (`learn`), the list, the change and the
 * notes for maintainers.
 */
export function HowItWasMade({
  timeline,
  rows,
  learn = null,
  helped,
  links,
}: {
  timeline: PrTimeline;
  rows: readonly MadeRow[];
  learn?: ReactNode;
  helped: PrTimelineHelped | null;
  links: MaintainerLinks;
}) {
  const who = timeline.contributorLogin ?? 'the contributor';
  return (
    <>
      {learn}
      <section className="flex min-w-0 flex-col gap-4" aria-labelledby="fix-made" data-fix-made="">
        <h2 id="fix-made" className="m-0 text-base font-semibold">
          How this pull request was made
        </h2>
        <MadeList rows={rows} />
        {timeline.partial ? (
          <p className="m-0 text-xs text-muted-foreground">
            The maintainers’ reviews could not be read just now. They show again shortly.
          </p>
        ) : null}
        <p className="m-0 text-xs text-muted-foreground">
          GitRanks made this list from the record of the work. What {who} and their agent said to each other is never
          shown.
        </p>
      </section>
      <FixChangeCard change={fixChangeOf(timeline)} />
      <ForMaintainers timeline={timeline} helped={helped} links={links} />
    </>
  );
}
