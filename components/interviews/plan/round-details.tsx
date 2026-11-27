'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useId, useState } from 'react';

import { BasisChip } from '@/components/interviews/sources/basis-chip';
import { SourceList } from '@/components/interviews/sources/source-list';
import { WrongForm, WrongLink } from '@/components/interviews/sources/wrong-form';
import { aiWordsOf, minutesWordsOf, roundCountWordsOf, thinWordsOf } from '@/lib/interviews/plan';
import { readOnOf, sourcesOf, sourcesWordsOf } from '@/lib/interviews/sources';
import type { InterviewRound, InterviewSource } from '@/lib/interviews/types';

/** How many of a round's sources show before "N more sources". */
const ROUND_SOURCES_SHOWN = 3;

/**
 * "Details and sources" under a round's items, opened in place: how many, how long, where it happens, the rule on AI
 * help; who states the facts and the sources with their dates; the line on a thin round or on what the sources
 * disagree on; and "This is wrong", whose short form opens in the same place with the round's key.
 */
export function RoundDetails({
  round,
  sources,
  company,
  plan,
}: {
  round: InterviewRound;
  sources: readonly InterviewSource[];
  company: { slug: string; name: string };
  plan: string;
}) {
  const [open, setOpen] = useState(false);
  const [wrong, setWrong] = useState(false);
  const panel = useId();
  const own = sourcesOf(round.sources, sources);
  const readOn = readOnOf(own);
  const facts = [
    ['How many', roundCountWordsOf(round.count)],
    ['How long', minutesWordsOf(round.minutes, round.count)],
    ['Where', round.format?.trim() || null],
    ['AI help', aiWordsOf(round.ai)],
  ].filter((fact): fact is [string, string] => !!fact[1]);
  // The round's notes, and the thin line besides them on a thin round.
  const notes = [
    ['notes', round.notes?.trim() || null],
    ['thin', round.thin ? thinWordsOf(round, sources) : null],
  ].filter((note): note is [string, string] => !!note[1]);
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((was) => !was)}
        className={
          open
            ? 'inline-flex items-center gap-1 self-start text-xs font-semibold text-foreground hover:underline'
            : 'inline-flex items-center gap-1 self-start text-xs text-muted-foreground hover:underline'
        }
      >
        <Chevron aria-hidden="true" className="size-3.5 shrink-0" />
        Details and sources
      </button>
      {open && (
        <div
          id={panel}
          data-round-details={round.key}
          className="flex flex-col gap-3 rounded-lg border bg-background p-3"
        >
          {facts.length > 0 && (
            <dl className="m-0 flex flex-col gap-1.5 text-sm">
              {facts.map(([name, value]) => (
                <div key={name} className="flex gap-3">
                  <dt className="w-21 flex-none text-muted-foreground">{name}</dt>
                  <dd className="m-0">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <BasisChip basis={round.basis} company={company.name} />
            {own.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {sourcesWordsOf(own.length)}
                {readOn && `, read on ${readOn}`}
              </span>
            )}
          </div>
          <SourceList sources={own} company={company.name} shown={ROUND_SOURCES_SHOWN} />
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="flex flex-col gap-1">
              {notes.map(([kind, words]) => (
                <span key={kind} data-round-note={kind} className="text-xs text-muted-foreground">
                  {words}
                </span>
              ))}
            </span>
            <WrongLink open={wrong} onToggle={() => setWrong((was) => !was)} />
          </div>
          {wrong && (
            <WrongForm
              report={{ company: company.slug, plan, fact: round.key }}
              label="What is wrong with this round?"
              frame="line"
              onClose={() => setWrong(false)}
            />
          )}
        </div>
      )}
    </>
  );
}
