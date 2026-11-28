import type { Metadata } from 'next';

/** A Build page not built yet is never indexed. */
export const BUILD_PLACEHOLDER_METADATA: Metadata = {
  title: 'GitRanks Build',
  robots: { index: false, follow: false },
};

/**
 * What a Build address shows until its page is built: the page's name in Build's reading column.
 */
export function BuildPlaceholder({ title }: { title: string }) {
  return (
    <main data-build-placeholder className="mx-auto flex w-full max-w-[860px] flex-col gap-2 px-4 pt-8 pb-16">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-base text-muted-foreground">This page is on its way.</p>
    </main>
  );
}
