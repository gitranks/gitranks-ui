'use client';

import { ExternalLink } from 'lucide-react';
import { Fragment, useState } from 'react';

import { sourceLineOf, sourceTitleOf } from '@/lib/interviews/sources';
import type { InterviewSource } from '@/lib/interviews/types';

/** How many sources a list shows before "N more sources". */
export const SOURCES_SHOWN = 4;

/** One source: its title, which opens it in a new tab, and under it its site, what it is and when. */
function SourceRow({ source, company }: Readonly<{ source: InterviewSource; company: string }>) {
  const line = sourceLineOf(source, company);
  return (
    <li className="flex flex-col gap-0.5" data-source={source.id}>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-link hover:underline"
      >
        {sourceTitleOf(source)}
        <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
      </a>
      <span className="text-xs text-muted-foreground">
        {line.map((part, index) => (
          <Fragment key={index}>
            {index > 0 && <span aria-hidden="true"> · </span>}
            {part}
          </Fragment>
        ))}
      </span>
    </li>
  );
}

/**
 * A fact's or a section's sources, as they open in place: the first few, then "N more sources", which shows the rest
 * where it stands. Nothing is drawn with no source.
 */
export function SourceList({
  sources,
  company,
  shown = SOURCES_SHOWN,
}: Readonly<{ sources: readonly InterviewSource[]; company: string; shown?: number }>) {
  const [all, setAll] = useState(false);
  if (!sources.length) return null;
  const rows = all ? sources : sources.slice(0, shown);
  const more = sources.length - rows.length;
  return (
    <>
      <ul className="m-0 flex list-none flex-col gap-3 p-0" data-source-list="">
        {rows.map((source) => (
          <SourceRow key={source.id} source={source} company={company} />
        ))}
      </ul>
      {more > 0 && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="self-start text-xs text-muted-foreground hover:underline"
        >
          {more} more {more === 1 ? 'source' : 'sources'}
        </button>
      )}
    </>
  );
}
