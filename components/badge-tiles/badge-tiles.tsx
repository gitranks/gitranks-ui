import type { FC } from 'react';

import type { BadgeTile } from '@/badge/v3/tiles';
import { Link } from '@/components/link/link';
import { cn } from '@/lib/utils';

const IMAGE_PROPS = { loading: 'lazy', decoding: 'async' } as const;

/**
 * One badge, drawn by its real URL, as a link to its code in the builder. Both drawings of Auto are in the page and
 * the site's theme shows one; a hidden lazy image is not fetched.
 */
export const BadgeTileLink: FC<{ tile: BadgeTile }> = ({ tile }) => {
  const shield = tile.format === 'shield';
  const size = tile.size ?? undefined;
  const imageClass = shield ? 'h-auto w-auto max-w-full' : 'h-auto w-full';
  const style = size ? { maxWidth: size.width } : undefined;

  return (
    <Link
      href={tile.href}
      rel="nofollow"
      title="Get the code"
      className={cn(
        'flex min-h-11 items-center justify-center rounded-lg border bg-background p-2.5 no-underline',
        'transition-colors hover:border-primary/60 hover:bg-muted/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- live badge images */}
      <img
        src={tile.src.light}
        alt={tile.alt}
        width={size?.width}
        height={size?.height}
        className={cn(imageClass, 'dark:hidden')}
        style={style}
        {...IMAGE_PROPS}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- live badge images */}
      <img
        src={tile.src.dark}
        alt={tile.alt}
        width={size?.width}
        height={size?.height}
        className={cn(imageClass, 'hidden dark:block')}
        style={style}
        {...IMAGE_PROPS}
      />
      <span className="sr-only"> – get the code</span>
    </Link>
  );
};

/** Shields in a grid of small tiles, then cards, then charts, each side by side where they fit. */
export const BadgeTiles: FC<{ tiles: BadgeTile[]; className?: string }> = ({ tiles, className }) => {
  const shields = tiles.filter(({ format }) => format === 'shield');
  const cards = tiles.filter(({ format }) => format === 'card');
  const charts = tiles.filter(({ format }) => format === 'chart');

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {!!shields.length && (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-2">
          {shields.map((tile) => (
            <li key={tile.key} className="grid">
              <BadgeTileLink tile={tile} />
            </li>
          ))}
        </ul>
      )}
      {!!cards.length && (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))] gap-2">
          {cards.map((tile) => (
            <li key={tile.key} className="grid">
              <BadgeTileLink tile={tile} />
            </li>
          ))}
        </ul>
      )}
      {!!charts.length && (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,560px),1fr))] gap-2">
          {charts.map((tile) => (
            <li key={tile.key} className="grid">
              <BadgeTileLink tile={tile} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
