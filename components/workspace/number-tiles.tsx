import { ArrowRight } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

/**
 * A front tab's four numbers, two by two on a phone, each a link to where its rows are (`name`: which tab's, for the
 * page's own checks).
 */
export function NumberTiles({
  tiles,
  name,
}: {
  tiles: readonly { value: string; label: string; href: Route }[];
  name: string;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-number-tiles={name}>
      {tiles.map((tile) => (
        <li key={tile.label}>
          <Link
            href={tile.href}
            prefetch={false}
            className="group flex h-full flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40"
          >
            <span className="flex items-start justify-between gap-2">
              <span className="font-mono text-2xl font-bold tabular-nums">{tile.value}</span>
              <ArrowRight aria-hidden="true" className="size-4 text-muted-foreground group-hover:text-foreground" />
            </span>
            <span className="text-sm text-muted-foreground">{tile.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
