'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useId, useState } from 'react';

import type { WrongReport } from './report-send';
import { SourceList } from './source-list';
import { WrongForm, WrongLink } from './wrong-form';
import { readOnOf, sourcesWordsOf } from '@/lib/interviews/sources';
import type { InterviewSource } from '@/lib/interviews/types';

/**
 * The line under a section's facts: "21 sources" opens them in place, under the facts they belong to, and "This is
 * wrong" opens its short form there too. The two open apart. The sources end with the day they were read, and `after`
 * (a sentence on what they disagree on) when the page has one. With no source, the line holds "This is wrong" alone.
 */
export function SourcesInPlace({
  sources,
  company,
  report,
  label,
  placeholder,
  after,
}: Readonly<{
  sources: readonly InterviewSource[];
  /** The company's name, as the sources' lines say it ("Northwind's own page"). */
  company: string;
  report: WrongReport;
  /** The short form's question: "What is wrong with these facts?" */
  label: string;
  placeholder?: string;
  after?: string | null;
}>) {
  const [open, setOpen] = useState(false);
  const [wrong, setWrong] = useState(false);
  const panel = useId();
  const readOn = readOnOf(sources);
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <div className="flex flex-col gap-3" data-sources-in-place={report.fact}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {sources.length > 0 && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panel}
            onClick={() => setOpen((was) => !was)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:underline"
          >
            <Chevron aria-hidden="true" className="size-3.5 shrink-0" />
            {sourcesWordsOf(sources.length)}
          </button>
        )}
        <WrongLink open={wrong} onToggle={() => setWrong((was) => !was)} className="ms-auto" />
      </div>
      {open && (
        <div id={panel} className="flex flex-col gap-2 rounded-lg border bg-background p-3">
          <span className="text-xs font-semibold text-muted-foreground">Where these facts come from</span>
          <SourceList sources={sources} company={company} />
          {(readOn || after) && (
            <p className="m-0 text-xs text-muted-foreground">
              {[readOn ? `We read these on ${readOn} and wrote the facts in our own words.` : null, after]
                .filter(Boolean)
                .join(' ')}
            </p>
          )}
        </div>
      )}
      {wrong && <WrongForm report={report} label={label} placeholder={placeholder} onClose={() => setWrong(false)} />}
    </div>
  );
}
