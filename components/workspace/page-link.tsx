import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

/** The mark after a link that opens a new tab: the arrow people see, and the words a screen reader says. */
function NewTabMark({ words }: { words: string }) {
  return (
    <>
      {' '}
      <span aria-hidden="true">↗</span>
      <span className="sr-only"> ({words})</span>
    </>
  );
}

/** The mark after a link to GitHub. */
export const OpensGitHub = () => <NewTabMark words="opens GitHub" />;

/** The mark after a link to another site, or one whose words already name GitHub. */
export const OpensNewTab = () => <NewTabMark words="opens in a new tab" />;

/** An address on GitHub. */
export const isGitHubHref = (href: string) => href.startsWith('https://github.com/');

/** A full address of any site, rather than one of our pages. */
const isAbsoluteHref = (href: string) => /^https?:\/\//.test(href);

/**
 * A link a page part is given: one of our pages in this tab; GitHub, or any other full address, in a new tab with its
 * mark, like every other such link on these pages.
 */
export function PageLink({ href, className, children }: { href: Route; className?: string; children: ReactNode }) {
  if (isAbsoluteHref(href)) {
    return (
      <a className={className} href={href} target="_blank" rel="noopener noreferrer">
        {children}
        {isGitHubHref(href) ? <OpensGitHub /> : <OpensNewTab />}
      </a>
    );
  }
  return (
    <Link className={className} href={href} prefetch={false}>
      {children}
    </Link>
  );
}
