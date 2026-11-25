import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { H2, MUTED_SECTION, WIDTH } from '@/components/workspace/getting-in/landing-parts';
import { PHONE_LINK } from '@/components/workspace/phone-link';
import { cn } from '@/lib/utils';

const EYEBROW = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase';

/**
 * "Honest with maintainers", the band both landings end their story with: what a product promises maintainers, a link
 * to the page for them, and beside it the footer every pull request it opens ends with, as a maintainer reads it. Each
 * landing passes its own words, link and footer lines.
 */
export function LandingBand({
  text,
  href,
  footer,
  muted = false,
}: {
  text: string;
  /** The page for maintainers. */
  href: Route;
  /** The footer's lines, as the product writes them. */
  footer: ReactNode;
  /** On the muted band's ground, where the section before it is plain. */
  muted?: boolean;
}) {
  const grid = 'grid items-center gap-10 py-11 sm:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16';
  const body = (
    <>
      <div className="flex min-w-0 flex-col gap-4">
        <h2 className={H2}>Honest with maintainers</h2>
        <p className="m-0 max-w-prose text-muted-foreground">{text}</p>
        <Link href={href} className={cn('self-start font-semibold text-link hover:underline', PHONE_LINK)}>
          For maintainers →
        </Link>
      </div>
      <div className="flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm">
        <span className={EYEBROW}>At the end of the pull request</span>
        <p className="m-0 text-xs text-muted-foreground">{footer}</p>
      </div>
    </>
  );
  if (!muted) return <section className={cn(WIDTH, grid)}>{body}</section>;
  return (
    <section className={MUTED_SECTION}>
      <div className={cn(WIDTH, grid)}>{body}</div>
    </section>
  );
}
