import type { ReactNode } from 'react';

import { archiveHeroOf, cardHeroOf } from '../hero-link-previews';
import { Uncounted } from './uncounted';
import { UnsungHeroCard } from '@/app/components/landing/unsung-hero-card';
import { LinkCard, LinkHead } from '@/app/follow/components/link-page';
import { HeroThisWeek, PastHeroRow } from '@/app/unsung-heroes/components/hero-parts';
import { Button } from '@/components/ui/button';
import type { LinkTrouble } from '@/lib/link-token/follow-pages';
import type { HeroLink, HeroLinkState } from '@/lib/link-token/hero-pages';
import { heroWeekLabel } from '@/lib/unsung-hero/unsung-hero';

const longDay = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
const longDate = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });

/** "Monday, November 17". */
const dayOf = (iso: string) => longDay.format(new Date(iso));
/** "November 24". */
const dateOf = (iso: string) => longDate.format(new Date(iso));

/** What each hero page says when its link does not work. */
const TROUBLE: Record<LinkTrouble['kind'], { title: string; text: string }> = {
  'timed-out': { title: 'This link has timed out', text: 'Open it from your email again.' },
  unavailable: {
    title: 'This page is not available right now',
    text: 'Nothing was changed. Try again in a few minutes.',
  },
  unknown: {
    title: 'This link does not work',
    text: 'Open it from your latest email about Unsung hero. Nothing was changed.',
  },
};

export function HeroTroubleCard({ trouble }: Readonly<{ trouble: LinkTrouble }>) {
  const { title, text } = TROUBLE[trouble.kind];
  return (
    <LinkCard>
      <LinkHead title={title} />
      <p className="text-sm text-muted-foreground">{text}</p>
    </LinkCard>
  );
}

/** A short notice of what the last press did. */
const Notice = ({ children }: Readonly<{ children: ReactNode }>) => (
  <p role="status" className="rounded-xl border bg-muted/40 p-4 text-sm">
    {children}
  </p>
);

const Name = ({ link }: Readonly<{ link: HeroLink }>) => (
  <span className="font-medium break-all">{link.repo.nameWithOwner}</span>
);

/** Where the link's week stands, in one sentence. */
function WeekSentence({ link }: Readonly<{ link: HeroLink }>) {
  const week = heroWeekLabel(link);
  switch (link.week) {
    case 'upcoming':
      return (
        <>
          From {dayOf(link.startsAt)}, GitRanks features <Name link={link} /> on its home page for a week ({week}), as
          our Unsung hero.
        </>
      );
    case 'live':
      return (
        <>
          <Name link={link} /> is our Unsung hero this week ({week}), on the GitRanks home page.
        </>
      );
    default:
      return (
        <>
          <Name link={link} /> was our Unsung hero for {week}, and is listed among our past heroes.
        </>
      );
  }
}

type HeroOptOutViewProps = {
  state: HeroLinkState;
  /** The buttons' form action; left out where nothing can be pressed (a spec). */
  action?: (form: FormData) => void;
  pending?: boolean;
};

/**
 * `/hero-link/opt-out`: the week a heads-up's opt-out link names, and one Opt out button. Nothing changes until the
 * press; after it, Undo for 7 days.
 */
export function HeroOptOutView({ state, action, pending = false }: Readonly<HeroOptOutViewProps>) {
  if (state.kind !== 'link') return <HeroTroubleCard trouble={state} />;
  const { link, note } = state;

  if (link.week === 'cancelled') {
    return (
      <LinkCard>
        <LinkHead eyebrow="Unsung hero" title="This week is off" />
        <p className="text-sm">
          We will not feature <Name link={link} /> for {heroWeekLabel(link)}. There is nothing to opt out of.
        </p>
      </LinkCard>
    );
  }

  if (link.week === 'opted-out' && !link.canOptOut) {
    return (
      <LinkCard>
        <LinkHead eyebrow="Opted out" title="You are opted out" />
        {note === 'already' && <Notice>You had already opted out.</Notice>}
        {note === 'undo-expired' && <Notice>The 7 days to undo this are over.</Notice>}
        <p className="text-sm">
          We will not feature <Name link={link} />, and we will not ask you again.
          {link.undoUntil && ` Changed your mind? You can undo this until ${dateOf(link.undoUntil)}.`}
        </p>
        {link.undoUntil && (
          <form action={action}>
            <Button
              type="submit"
              name="change"
              value="undo"
              variant="outline"
              disabled={pending}
              className="max-sm:min-h-11"
            >
              Undo
            </Button>
          </form>
        )}
      </LinkCard>
    );
  }

  if (!link.canOptOut) {
    // A week the API says cannot be opted out of now, in a state this page does not know: say where it stands only.
    return (
      <LinkCard>
        <LinkHead eyebrow="Unsung hero" title={link.repo.nameWithOwner} />
        <p className="text-sm">
          <WeekSentence link={link} />
        </p>
      </LinkCard>
    );
  }

  return (
    <LinkCard>
      <LinkHead eyebrow="Unsung hero" title="Opt out of Unsung hero?" />
      {note === 'restored' && (
        <Notice>
          Opt-out undone: <Name link={link} /> is back for {heroWeekLabel(link)}.
        </Notice>
      )}
      {note === 'undone' && <Notice>Opt-out undone. Its week had already started, so it stays empty.</Notice>}
      {note === 'week-taken' && <Notice>Opt-out undone. Another project has that week now.</Notice>}
      {link.week === 'opted-out' ? (
        <p className="text-sm">
          We will not feature <Name link={link} /> that week, and we may ask you about another one. Opt out, and we will
          not ask again.
        </p>
      ) : (
        <p className="text-sm">
          <WeekSentence link={link} />
        </p>
      )}
      <p className="text-sm text-muted-foreground">No reason needed. We will not ask again.</p>
      <form action={action}>
        <Button type="submit" name="change" value="opt-out" disabled={pending} className="max-sm:min-h-11">
          Opt out
        </Button>
      </form>
    </LinkCard>
  );
}

/**
 * `/hero-link/preview`: the home card and the archive's block for the week a heads-up names, as visitors will see
 * them; after the week, its row among the past heroes. Nothing to press, and nothing changes; a press of Star on GitHub
 * here is not counted.
 */
export function HeroPreviewView({ state }: Readonly<{ state: HeroLinkState }>) {
  if (state.kind !== 'link') return <HeroTroubleCard trouble={state} />;
  const { link } = state;

  if (link.week === 'opted-out' || link.week === 'cancelled') {
    return (
      <LinkCard>
        <LinkHead eyebrow="Unsung hero" title={link.week === 'opted-out' ? 'You are opted out' : 'This week is off'} />
        <p className="text-sm">
          We will not feature <Name link={link} /> for {heroWeekLabel(link)}, so there is nothing to preview.
        </p>
      </LinkCard>
    );
  }

  return (
    <>
      <LinkCard>
        <LinkHead eyebrow="Unsung hero" title="Your week, as visitors will see it" />
        <p className="text-sm">
          <WeekSentence link={link} />
        </p>
        <p className="text-sm text-muted-foreground">
          Rather not be featured? Press “No thanks, opt me out” in our email. No reason needed.
        </p>
      </LinkCard>
      {link.week === 'done' ? (
        <section aria-labelledby="preview-archive" className="flex flex-col gap-3">
          <h2 id="preview-archive" className="text-sm font-semibold text-muted-foreground">
            Among the past heroes on our page of Unsung heroes
          </h2>
          <ol className="m-0 flex list-none flex-col p-0">
            <PastHeroRow hero={{ ...archiveHeroOf(link), live: false }} />
          </ol>
        </section>
      ) : (
        <>
          <section aria-labelledby="preview-card" className="flex flex-col gap-3">
            <h2 id="preview-card" className="text-sm font-semibold text-muted-foreground">
              On the home page
            </h2>
            <Uncounted>
              <div className="w-full max-w-md">
                <UnsungHeroCard hero={cardHeroOf(link)} />
              </div>
            </Uncounted>
          </section>
          <section aria-labelledby="preview-archive" className="flex flex-col gap-3">
            <h2 id="preview-archive" className="text-sm font-semibold text-muted-foreground">
              On our page of Unsung heroes
            </h2>
            <HeroThisWeek hero={archiveHeroOf(link)} report={false} headingId="preview-this-week" />
          </section>
        </>
      )}
    </>
  );
}
