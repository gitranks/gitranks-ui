import type { ReactNode } from 'react';

import { Header } from '@/components/header/header';
import { LAST_UPDATED, legalDate } from '@/lib/legal';

/** One section of a legal page: its anchor, its heading (also the contents entry) and its text. */
export type LegalSection = { id: string; title: string; body: ReactNode };

/**
 * The reading layout of the Privacy policy and the Terms: the site header, the text at reading width, the title, the
 * "Last updated" line, a short contents list with anchors, then the sections.
 */
export function LegalPage({ title, intro, sections }: { title: string; intro?: ReactNode; sections: LegalSection[] }) {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-6 pb-16 md:pt-12">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Last updated <time dateTime={LAST_UPDATED}>{legalDate()}</time>
          </p>
          {intro}
        </header>

        <nav aria-labelledby="contents" className="flex flex-col gap-3 rounded-md border p-4 md:p-5">
          <h2 id="contents" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            On this page
          </h2>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="underline-offset-2 hover:underline">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-title`}
            className="flex scroll-mt-6 flex-col gap-3 leading-relaxed"
          >
            <h2 id={`${section.id}-title`} className="text-xl font-semibold">
              {section.title}
            </h2>
            {section.body}
          </section>
        ))}
      </main>
    </>
  );
}

/** A paragraph of a legal page. */
export const P = ({ children }: { children: ReactNode }) => <p>{children}</p>;

/** A bulleted list of a legal page. */
export const List = ({ children }: { children: ReactNode }) => (
  <ul className="flex list-disc flex-col gap-2 pl-6">{children}</ul>
);

/** A word or phrase that carries the sentence. */
export const B = ({ children }: { children: ReactNode }) => <strong className="font-semibold">{children}</strong>;

/** A link inside the text, underlined so it isn't told apart from the text by colour alone. */
export function A({ href, children }: { href: string; children: ReactNode }) {
  const external = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      className="underline underline-offset-2 hover:text-muted-foreground"
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  );
}
