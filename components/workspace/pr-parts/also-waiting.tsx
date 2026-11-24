'use client';

import { Button } from '@/components/ui/button';
import { onlyYouWordsOf } from '@/lib/workspace/pull-request-page';
import type { PullRequestOnlyYou } from '@/lib/workspace/pull-request-page.types';

/**
 * "Also waiting for you": the other things only the person can do, when more than one waits. The first one is the
 * box's; each other is a row with its words and its own button. Nothing when no other waits.
 */
export function AlsoWaiting({
  onlyYou,
  onOnlyYou,
}: {
  /** All of them, the box's first. */
  onlyYou: readonly PullRequestOnlyYou[];
  onOnlyYou?: (kind: string, which: 'main' | 'alt') => void;
}) {
  const others = onlyYou.slice(1);
  if (!others.length) return null;
  return (
    <section className="flex flex-col gap-2" aria-labelledby="also-waiting" data-also-waiting="">
      <h2 id="also-waiting" className="m-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Also waiting for you
      </h2>
      <ul className="m-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0">
        {others.map((item, index) => {
          const words = onlyYouWordsOf(item);
          const external = words.external && item.url;
          return (
            <li
              // Two items may be of one kind; their place in the list tells them apart.
              key={`${item.kind}-${index}`}
              className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4"
            >
              <span className="min-w-0 flex-1 text-sm text-foreground">{item.text}</span>
              {external ? (
                <Button asChild variant="outline" className="h-9 self-start px-4 max-sm:min-h-11 sm:self-center">
                  <a href={item.url ?? undefined} target="_blank" rel="noopener noreferrer">
                    {words.short} <span aria-hidden="true">↗</span>
                    <span className="sr-only">(opens GitHub)</span>
                  </a>
                </Button>
              ) : onOnlyYou ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 self-start px-4 max-sm:min-h-11 sm:self-center"
                  onClick={() => onOnlyYou(item.kind, 'main')}
                >
                  {words.short}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
