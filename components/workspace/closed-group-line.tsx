'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { type ReactNode, useId, useState } from 'react';

/**
 * A group the user does not use, closed to one quiet line (W1 §9.4, §10.3): "Hosted agent · for Contribute · not set
 * up. What it is". The link opens its page; with `children` it opens them in place instead (the group's pitch), and
 * `href` is where the page lives for a reader without script.
 */
export function ClosedGroupLine({
  title,
  text,
  link,
  children,
  id,
}: {
  title: string;
  text: string;
  link: { href: Route; label: string };
  /** What the link opens in place, under the line. */
  children?: ReactNode;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  return (
    <div
      id={id}
      data-closed-group={title}
      className="flex scroll-mt-20 flex-col gap-4 rounded-xl border border-dashed px-4 py-3.5 text-sm"
    >
      <p>
        <span className="font-semibold">{title}</span> <span className="text-muted-foreground">{text}</span>{' '}
        {children ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panel}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex font-semibold text-link hover:underline max-sm:min-h-11 max-sm:items-center"
          >
            {open ? 'Hide' : link.label}
          </button>
        ) : (
          <Link href={link.href} prefetch={false} className="font-semibold text-link hover:underline">
            {link.label}
          </Link>
        )}
      </p>
      {children ? (
        <div id={panel} hidden={!open}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
