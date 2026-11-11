import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Eyebrow } from './primitives';
import {
  ABOUT_PATH,
  CONTRIBUTE_TERMS_PATH,
  FAQ_PATH,
  MAINTAINERS_PATH,
  MCP_DOCS_PATH,
} from '@/lib/contribute/contribute-path';
import { cn } from '@/lib/utils';

/** Contribute's pages open to every visitor, linked from each other's foot. */
export type PublicPage = 'landing' | 'maintainers' | 'mcp' | 'faq' | 'terms';

const PUBLIC_PAGES: { page: PublicPage; href: Route; title: string; text: string }[] = [
  {
    page: 'landing',
    href: ABOUT_PATH,
    title: 'GitRanks Contribute',
    text: 'What it does, from an issue to a merged pull request.',
  },
  {
    page: 'mcp',
    href: MCP_DOCS_PATH,
    title: 'MCP server',
    text: 'Sign in from Claude Code, Codex, Cursor, Gemini CLI, VS Code or claude.ai, or use a token: setup, tools, limits.',
  },
  {
    page: 'faq',
    href: FAQ_PATH,
    title: 'Questions',
    text: 'Whose name is on the PR, what it costs, what if the agent is wrong.',
  },
  {
    page: 'maintainers',
    href: MAINTAINERS_PATH as Route,
    title: 'For maintainers',
    text: 'The rules every PR follows in your repo, and how to opt it out.',
  },
  {
    page: 'terms',
    href: CONTRIBUTE_TERMS_PATH,
    title: 'Terms',
    text: 'Your key, your review, your pull requests.',
  },
];

/** The head of a public page, as the maintainers page draws it: an eyebrow, the title and a lead. */
export function PublicPageHead({
  eyebrow,
  title,
  children,
}: {
  eyebrow: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <Eyebrow className="text-primary">{eyebrow}</Eyebrow>
      <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">{title}</h1>
      <div className="text-lg text-muted-foreground">{children}</div>
    </div>
  );
}

/** One entry of a page's contents: its anchor and its name. */
export type DocSection = { id: string; title: string };

/**
 * A reading page: the contents on the left from `lg`, sticky as the page scrolls, and the text at reading width. On a
 * phone the contents sit above the text.
 */
export function DocLayout({ sections, children }: { sections: DocSection[]; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
      <nav
        aria-labelledby="doc-contents"
        className="flex flex-col gap-2.5 rounded-xl border p-4 lg:sticky lg:top-6 lg:w-56 lg:flex-none lg:border-0 lg:p-0"
      >
        <Eyebrow>
          <span id="doc-contents">On this page</span>
        </Eyebrow>
        <ol className="flex flex-col gap-1.5 text-sm">
          {sections.map(({ id, title }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="inline-flex items-center max-sm:min-h-11 text-muted-foreground hover:text-foreground hover:underline"
              >
                {title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex min-w-0 max-w-3xl flex-1 flex-col gap-12">{children}</div>
    </div>
  );
}

/** A section of a reading page, its h2 the contents' entry. */
export function DocSection({
  id,
  title,
  text,
  children,
}: {
  id: string;
  title: string;
  text?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-6 flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 id={`${id}-title`} className="text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        {text ? <p className="text-muted-foreground">{text}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** The foot of every public page: the others, so a visitor from a directory or a PR footer finds the rest. */
export function MorePages({ current, className }: { current: PublicPage; className?: string }) {
  return (
    <nav aria-labelledby="more-pages" className={cn('flex flex-col gap-4 border-t pt-9', className)}>
      <h2 id="more-pages" className="text-xl font-semibold tracking-tight">
        More about Contribute
      </h2>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3.5">
        {PUBLIC_PAGES.filter(({ page }) => page !== current).map(({ page, href, title, text }) => (
          <li key={page} className="flex">
            <HashSafeLink
              href={href}
              className="flex min-w-0 flex-1 flex-col gap-1 rounded-xl border p-4 transition-colors hover:bg-muted/50"
            >
              <span className="font-semibold">{title} →</span>
              <span className="text-sm text-muted-foreground">{text}</span>
            </HashSafeLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * A link that keeps its `#anchor`: a page load for a hash (the Terms' Contribute section streams in after the page's
 * fallback, so a client navigation would land at the top), the router for the rest.
 */
export function HashSafeLink({ href, className, children }: { href: Route; className?: string; children: ReactNode }) {
  return href.includes('#') ? (
    <a href={href} className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} prefetch={false} className={className}>
      {children}
    </Link>
  );
}
