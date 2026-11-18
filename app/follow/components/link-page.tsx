import type { ReactNode } from 'react';

import { Link } from '@/components/link/link';
import type { FollowPackage } from '@/lib/link-token/follow-links.types';
import { type LinkTrouble, packageLabelOf } from '@/lib/link-token/follow-pages';
import { cn } from '@/lib/utils';
import { packagePath } from '@/utils/package-paths';

/** The card a link's page draws its one panel in. */
export function LinkCard({ children, className }: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <section
      className={cn('flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm sm:p-6 dark:shadow-none', className)}
    >
      {children}
    </section>
  );
}

/** A panel's eyebrow and title. */
export function LinkHead({ eyebrow, title }: Readonly<{ eyebrow?: string; title: string }>) {
  return (
    <div className="flex flex-col gap-1.5">
      {eyebrow && <span className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</span>}
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
    </div>
  );
}

/** A package's name, linked to its page. */
export function PackageName({ pkg, className }: Readonly<{ pkg: FollowPackage; className?: string }>) {
  return (
    <Link href={packagePath(pkg.name, pkg.registry || 'npm')} className={cn('font-medium break-all', className)}>
      {packageLabelOf(pkg)}
    </Link>
  );
}

/** What each page says when its link does not work: the same words everywhere but for an unknown link's. */
const TROUBLE: Record<Exclude<LinkTrouble['kind'], 'unknown'>, { title: string; text: string }> = {
  'timed-out': { title: 'This link has timed out', text: 'Open it from your email again.' },
  unavailable: {
    title: 'Following is not available right now',
    text: 'Nothing was changed. Try again in a few minutes.',
  },
};

/** A link that does not work: why, and what to do. `unknownText` is the page's own words for a link that reaches nothing. */
export function LinkTroubleCard({ trouble, unknownText }: Readonly<{ trouble: LinkTrouble; unknownText: string }>) {
  const { title, text } =
    trouble.kind === 'unknown' ? { title: 'This link does not work', text: unknownText } : TROUBLE[trouble.kind];
  return (
    <LinkCard>
      <LinkHead title={title} />
      <p className="text-sm text-muted-foreground">{text}</p>
    </LinkCard>
  );
}

/** The frame of a link's page, under the site's header: one narrow column. */
export function LinkPageMain({ children }: Readonly<{ children: ReactNode }>) {
  return <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 pt-6 pb-16 md:pt-12">{children}</main>;
}
