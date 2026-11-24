import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

/** The mark after a link to GitHub: the arrow people see, and the words a screen reader says. */
export function OpensGitHub() {
  return (
    <>
      {' '}
      <span aria-hidden="true">↗</span>
      <span className="sr-only"> (opens GitHub)</span>
    </>
  );
}

/** A full address (GitHub's) rather than one of our pages. */
export const isExternalHref = (href: string) => /^https?:\/\//.test(href);

/**
 * A link a page part is given: one of our pages in this tab, or GitHub in a new tab with its mark, like every other
 * link to GitHub on these pages.
 */
export function PageLink({ href, className, children }: { href: Route; className?: string; children: ReactNode }) {
  if (isExternalHref(href)) {
    return (
      <a className={className} href={href} target="_blank" rel="noopener noreferrer">
        {children}
        <OpensGitHub />
      </a>
    );
  }
  return (
    <Link className={className} href={href} prefetch={false}>
      {children}
    </Link>
  );
}
