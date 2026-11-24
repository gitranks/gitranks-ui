'use client';

import { Check, ChevronDown, ChevronUp, Lock, Share } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { Kbd } from '@/components/learn/question/kbd';
import { Button } from '@/components/ui/button';
import { RichText } from '@/components/workspace/blocks/rich-text';
import { CopyButton } from '@/components/workspace/copy-button';
import type { InsightId, InsightRow, LearnLesson } from '@/lib/learn/lesson-page';
import { cn } from '@/lib/utils';

const EYEBROW = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase';
const SMALL = 'h-8 gap-1.5 sm:min-h-8';

/** Fields, menus and dialogs keep their own keys: a number typed there never opens a row. */
const NOT_OURS = 'input, textarea, select, [contenteditable], [role=menu], [role=listbox], [role=dialog]';

/**
 * Share for "Did you know?": copies the fact's link and says so in the same button, which keeps its width. On a touch
 * screen with the phone's own share sheet, that opens instead.
 */
function ShareFact({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    if (typeof navigator.share === 'function' && window.matchMedia?.('(pointer: coarse)').matches) {
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <>
      <Button type="button" variant="outline" onClick={share} className={cn(SMALL, 'w-[136px] max-sm:min-h-11')}>
        {copied ? <Check aria-hidden="true" /> : <Share aria-hidden="true" />}
        {copied ? 'Link copied' : 'Share'}
      </Button>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'Link copied' : ''}
      </span>
    </>
  );
}

/** What an open row shows, by insight. */
function RowBody({ id, lesson, factPath }: { id: InsightId; lesson: InsightLesson; factPath: string }) {
  if (id === 'fact' && lesson.fact) {
    return (
      <>
        <p className="m-0 text-sm leading-relaxed">
          <RichText text={lesson.fact.text} />
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <ShareFact path={factPath} title={lesson.fact.title} />
          <span className="text-xs text-muted-foreground">
            Source:{' '}
            <a href={lesson.fact.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {lesson.fact.source}
            </a>
          </span>
        </div>
      </>
    );
  }
  const text = id === 'deeper' ? lesson.deeper : lesson.say;
  if (!text) return null;
  return (
    <>
      <p className="m-0 text-sm leading-relaxed whitespace-pre-line">
        <RichText text={text} />
      </p>
      <div>
        <CopyButton text={text} label="Copy" className={SMALL} />
      </div>
    </>
  );
}

type InsightLesson = Pick<LearnLesson, 'say' | 'fact' | 'deeper'>;

/**
 * Under the question card: what the lesson gives after a right answer. Before one, the rows are locked and say what
 * each holds, with a way to show them without answering. Open, it is "What to take with you": one row open at a time,
 * each opened by a click or, once the question is answered, by its number.
 */
export function InsightsPanel({
  lesson,
  rows,
  unlocked,
  keys,
  hints,
  open,
  onOpen,
  onShow,
  factPath,
  footer,
}: {
  lesson: InsightLesson;
  rows: readonly InsightRow[];
  /** Answered right, or shown without answering. */
  unlocked: boolean;
  /** The number keys open the rows: only once the question no longer takes them. */
  keys: boolean;
  hints: boolean;
  open: InsightId | null;
  onOpen: (id: InsightId | null) => void;
  onShow: () => void;
  /** The address "Share" copies for the fact. */
  factPath: string;
  /** What closes the panel: the rating, for a member. */
  footer?: ReactNode;
}) {
  const baseId = useId();
  const live = useRef({ rows, open, onOpen });
  live.current = { rows, open, onOpen };

  useEffect(() => {
    if (!unlocked || !keys) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      if (!/^[1-9]$/.test(event.key)) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(NOT_OURS) || target?.isContentEditable) return;
      const { rows, open, onOpen } = live.current;
      const row = rows[Number(event.key) - 1];
      if (!row) return;
      event.preventDefault();
      onOpen(open === row.id ? null : row.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [unlocked, keys]);

  if (!rows.length) return null;

  if (!unlocked) {
    return (
      <section
        className="flex flex-col gap-3 rounded-xl border border-dashed p-4"
        aria-label="After you answer"
        data-insights="locked"
      >
        <span className={EYEBROW}>After you answer</span>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start gap-3" data-insight={row.id}>
              <span className="mt-0.5 inline-flex w-[22px] shrink-0 justify-center text-muted-foreground">
                <Lock className="size-[15px]" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium">{row.title}</span>
                <span className="text-xs text-muted-foreground">{row.sub}</span>
              </span>
              <div hidden>
                <RowBody id={row.id} lesson={lesson} factPath={factPath} />
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onShow}
          className="self-start border-0 bg-transparent p-0 text-xs font-medium text-link outline-none hover:underline focus-visible:underline max-sm:min-h-11"
          data-insights-show=""
        >
          Show them without answering
        </button>
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-xl border bg-card p-4"
      aria-label="What to take with you"
      data-insights="open"
    >
      <span className={EYEBROW}>What to take with you</span>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.map((row, index) => {
          const isOpen = open === row.id;
          const bodyId = `${baseId}-${row.id}`;
          const Chevron = isOpen ? ChevronUp : ChevronDown;
          return (
            <li
              key={row.id}
              className={cn('flex flex-col gap-3', isOpen && '-mx-3 rounded-lg bg-muted/50 p-3')}
              data-insight={row.id}
              data-insight-open={isOpen || undefined}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={bodyId}
                onClick={() => onOpen(isOpen ? null : row.id)}
                className="flex w-full items-start gap-3 border-0 bg-transparent p-0 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 max-sm:min-h-11"
              >
                <span className="mt-0.5 inline-flex w-[22px] shrink-0 items-center justify-center">
                  {keys && hints ? <Kbd>{index + 1}</Kbd> : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{row.title}</span>
                  {isOpen ? null : <span className="text-xs text-muted-foreground">{row.sub}</span>}
                </span>
                <Chevron className="mt-0.5 size-[15px] shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
              {/* A closed row's text stays in the page, folded, for search engines and agents. */}
              <div id={bodyId} hidden={!isOpen} className="flex flex-col gap-3 pl-[34px]">
                <RowBody id={row.id} lesson={lesson} factPath={factPath} />
              </div>
            </li>
          );
        })}
      </ul>
      {footer}
    </section>
  );
}
