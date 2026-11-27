'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { type Ref, useRef, useState } from 'react';

import { AgentRow } from './agent-row';
import { DiffCounts, StepFileBox } from './step-file';
import { StepPlan } from './step-plan';
import { StepQuestion } from './step-question';
import { StepStrip } from './step-strip';
import { type WholeFile, WholeFileDrawn, WholeFilePanel } from './whole-file-panel';
import { RichText } from '@/components/workspace/blocks/rich-text';
import { buildStepPath } from '@/lib/build/paths';
import { addedLinesOf, type BuildStepCodes } from '@/lib/build/step-diff';
import {
  agentRowOf,
  buildInOf,
  buildLanguageNameOf,
  buildSayOf,
  buildTreeUrlOf,
  filesWordsOf,
  isFirstStep,
  openFilesOf,
  paragraphsOf,
  placeWordsOf,
  playgroundWordsOf,
  playItemOf,
  type StepPersonal,
  startLanguageOf,
  stepFilesOf,
  stepLanguagesOf,
  stepSideOf,
  stripSquaresOf,
  stripStepsOf,
} from '@/lib/build/step-page';
import type { BuildLanguage, BuildProjectPage, BuildStepPage, BuildStepRef } from '@/lib/build/types';
import { useBuildLanguage } from '@/lib/build/use-build-language';
import { cn } from '@/lib/utils';
import type { HighlightedCode } from '@/lib/workspace/code-tokens';
import type { LearnAnswerState } from '@/lib/workspace/learn-answer';

/*
 * A step's page, one reading column, the same order for everyone: the title and the row with the sentence to say;
 * what the step does (and its sketch); on the first step, the base's steps and what the project needs; the change,
 * file by file, in the language picked; things to try; the question; "Explain more"; the steps before and after.
 * The person's side (the strip's squares, the row) changes in place once read; the language switch changes the files
 * and the note. A section with nothing in it is left out.
 */

export type BuildStepViewProps = {
  page: BuildStepPage;
  /** The step's project, for the strip's squares and the first step's lists; none when its read failed. */
  project: BuildProjectPage | null;
  codes: BuildStepCodes;
  questionCodes: readonly HighlightedCode[];
  /** The person's side, once read in the browser; none for a visitor, and until it is read. */
  personal: StepPersonal | null;
  /** The language to start at in place of the kept one (the catalogue's). */
  startLanguage?: BuildLanguage | null;
  /** Where the question's answer starts (the catalogue's). */
  answer?: LearnAnswerState;
  hints?: boolean;
  /** A file whose whole text the catalogue draws open beside the page. */
  drawnWholeFile?: string;
};

/** The language switch: one button for each language, the shown one pressed. */
function LanguageSwitch({
  languages,
  shown,
  onPick,
}: {
  languages: readonly BuildLanguage[];
  shown: BuildLanguage | null;
  onPick: (language: BuildLanguage) => void;
}) {
  return (
    <fieldset className="m-0 flex flex-wrap items-center gap-1 border-0 p-0" data-build-language-switch="">
      <legend className="sr-only">Language</legend>
      {languages.map((language) => {
        const on = language === shown;
        return (
          <button
            key={language}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(language)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 max-sm:min-h-8',
              on
                ? 'bg-brand-soft font-semibold text-brand-soft-foreground'
                : 'font-medium text-muted-foreground hover:bg-accent',
            )}
            data-build-language={language}
          >
            {buildLanguageNameOf(language)}
          </button>
        );
      })}
    </fieldset>
  );
}

/** Paragraphs of a step's text, with its `code` spans. */
function Paragraphs({ text, className }: { text: string; className?: string }) {
  const parts = paragraphsOf(text);
  if (!parts.length) return null;
  return (
    <div className={cn('flex flex-col gap-3 text-base leading-relaxed', className)}>
      {parts.map((part, index) => (
        // Paragraphs never move: the index is the paragraph.
        <p key={index} className="m-0">
          <RichText text={part} />
        </p>
      ))}
    </div>
  );
}

/** A card to the step before or after. */
function AroundCard({
  project,
  step,
  side,
  cardRef,
}: {
  project: string;
  step: BuildStepRef;
  side: 'before' | 'after';
  cardRef?: Ref<HTMLAnchorElement>;
}) {
  const after = side === 'after';
  return (
    <Link
      href={buildStepPath(project, step.slug)}
      ref={cardRef}
      className={cn(
        'flex flex-col gap-1 rounded-xl border bg-card p-4 outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
        after && 'text-right',
      )}
      data-build-around={side}
    >
      <span className={cn('inline-flex items-center gap-2 text-xs text-muted-foreground', after && 'justify-end')}>
        {after ? null : <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />}
        {after ? 'Next step' : 'Previous step'}
        {after ? <ArrowRight className="size-4 shrink-0" aria-hidden="true" /> : null}
      </span>
      <span className="text-sm font-medium">{step.title}</span>
    </Link>
  );
}

export function BuildStepView({
  page,
  project,
  codes,
  questionCodes,
  personal,
  startLanguage = null,
  answer,
  hints,
  drawnWholeFile,
}: BuildStepViewProps) {
  const languages = stepLanguagesOf(page);
  const { language, pick } = useBuildLanguage(languages, startLanguageOf(personal), startLanguage);
  const [whole, setWhole] = useState<string | null>(null);
  const nextRef = useRef<HTMLAnchorElement>(null);
  const side = stepSideOf(page, language);
  const files = stepFilesOf(side);
  const opens = openFilesOf(files);
  const anyChange = page.languages.some((one) => one.changed.length > 0);
  const counts = files.reduce((sum, file) => ({ added: sum.added + file.added, removed: sum.removed + file.removed }), {
    added: 0,
    removed: 0,
  });
  const fileCodes = codes.find((one) => one.language === side?.language)?.files ?? [];
  const build = buildInOf(personal, side?.language ?? null);
  const squares = stripSquaresOf(stripStepsOf(page, project), page, build);
  const row = agentRowOf(personal, side?.language ?? null);
  const note = side?.note?.trim() || null;
  const wholeOf = (path: string | null): WholeFile | null => {
    const file = files.find((one) => one.path === path);
    const text = side?.files.find((one) => one.path === path)?.text;
    if (!file || text === undefined || file.status === 'removed') return null;
    const code = fileCodes.find((one) => one.path === path)?.after ?? null;
    return { path: file.path, text, code, added: addedLinesOf(file.hunks) };
  };
  const drawn = drawnWholeFile ? wholeOf(drawnWholeFile) : null;
  const play = page.play.map(playItemOf).filter((item) => item.text);
  const playground = playgroundWordsOf(project?.playground);
  const more = paragraphsOf(page.more);
  const commit = side?.commit ?? null;

  return (
    <div className="relative" data-build-step={page.step.slug} data-build-step-language={side?.language ?? ''}>
      <StepStrip project={page.project} part={page.part} place={placeWordsOf(page)} squares={squares} />
      <main className="mx-auto flex w-full max-w-[860px] flex-col gap-8 px-4 pt-6 pb-16 sm:gap-10 sm:pt-8">
        <div className="flex flex-col gap-5">
          <h1 className="m-0 text-2xl font-bold tracking-tight text-balance sm:text-3xl">{page.step.title}</h1>
          <AgentRow
            row={row}
            project={page.project.slug}
            say={project ? buildSayOf(project.thing) : `${page.project.name} with GitRanks`}
          />
          <Paragraphs text={page.say} />
          {page.sketch?.trim() ? (
            <pre
              className="m-0 overflow-x-auto rounded-lg border bg-muted/50 p-4 font-mono text-[13px] leading-relaxed"
              data-build-sketch=""
            >
              {page.sketch.replace(/\s+$/, '')}
            </pre>
          ) : null}
          {!anyChange && note ? <p className="m-0 text-sm text-muted-foreground">{note}</p> : null}
        </div>

        {project && isFirstStep(page) ? <StepPlan project={project} here={page.step.slug} /> : null}

        {anyChange ? (
          <section
            className="flex min-w-0 flex-col gap-3"
            aria-labelledby="build-step-change"
            data-build-step-change=""
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 id="build-step-change" className="m-0 text-xl font-bold tracking-tight">
                  The change
                </h2>
                {files.length ? (
                  <span className="text-sm text-muted-foreground" data-build-change-counts="">
                    {filesWordsOf(files.length)}
                    {counts.added || counts.removed ? ' · ' : null}
                    <DiffCounts added={counts.added} removed={counts.removed} />
                  </span>
                ) : null}
              </div>
              {languages.length > 1 ? (
                <LanguageSwitch languages={languages} shown={side?.language ?? null} onPick={pick} />
              ) : null}
            </div>
            {note ? (
              <p className="m-0 text-sm text-muted-foreground" data-build-note="">
                <RichText text={note} />
              </p>
            ) : null}
            {files.length && side ? (
              files.map((file, index) => (
                <StepFileBox
                  key={`${side.language}:${file.path}`}
                  file={file}
                  code={fileCodes.find((one) => one.path === file.path) ?? null}
                  text={side.files.find((one) => one.path === file.path)?.text ?? null}
                  commit={side.commit}
                  open={opens[index] ?? false}
                  onWholeFile={() => setWhole(file.path)}
                />
              ))
            ) : (
              <p className="m-0 text-sm text-muted-foreground">
                {side ? `This step changes no file in ${buildLanguageNameOf(side.language)}.` : null}
              </p>
            )}
          </section>
        ) : null}

        {play.length ? (
          <section className="flex min-w-0 flex-col gap-3" aria-labelledby="build-step-try" data-build-step-try="">
            <div className="flex flex-col gap-1">
              <h2 id="build-step-try" className="m-0 text-xl font-bold tracking-tight">
                Try it
              </h2>
              {playground ? <p className="m-0 text-sm text-muted-foreground">{playground}</p> : null}
            </div>
            <ol className="m-0 flex list-none flex-col rounded-lg border bg-card p-0">
              {play.map((item, index) => (
                // Things to try never move: the index is the item.
                <li key={index} className={cn('flex items-start gap-3 p-3', index > 0 && 'border-t')}>
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold tabular-nums">
                    {index + 1}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm">
                      <RichText text={item.text} />
                    </span>
                    {item.type ? (
                      <code className="font-mono text-[13px] break-words whitespace-pre-wrap text-muted-foreground">
                        {item.type}
                      </code>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {page.question ? (
          <StepQuestion
            key={page.question.type === 'PREDICT_OUTPUT' ? `${page.question.id}:${side?.language}` : page.question.id}
            question={page.question}
            language={side?.language ?? null}
            highlighted={questionCodes}
            start={answer}
            hints={hints}
            onDone={() => nextRef.current?.focus()}
          />
        ) : null}

        {more.length ? (
          <details className="group rounded-lg border bg-card" data-build-step-more="">
            <summary className="cursor-pointer rounded-lg px-4 py-3 text-sm font-semibold outline-none select-none hover:bg-accent/40 focus-visible:ring-[3px] focus-visible:ring-ring/50">
              Explain more
            </summary>
            <Paragraphs text={page.more} className="border-t px-4 pt-3 pb-4" />
          </details>
        ) : null}

        {page.before || page.after ? (
          <nav className="grid grid-cols-2 gap-3" aria-label="Steps beside this one">
            {page.before ? <AroundCard project={page.project.slug} step={page.before} side="before" /> : <span />}
            {page.after ? (
              <AroundCard project={page.project.slug} step={page.after} side="after" cardRef={nextRef} />
            ) : (
              <span />
            )}
          </nav>
        ) : null}

        <p className="m-0 text-xs text-muted-foreground" data-build-step-foot="">
          Written and checked by GitRanks
          {commit ? (
            <>
              {' · '}
              <a href={buildTreeUrlOf(commit)} target="_blank" rel="noopener noreferrer" className="hover:underline">
                The whole project on GitHub
              </a>
            </>
          ) : null}
        </p>
      </main>
      {commit ? (
        <WholeFilePanel
          file={wholeOf(whole)}
          stepNumber={page.step.number}
          commit={commit}
          onClose={() => setWhole(null)}
        />
      ) : null}
      {drawn && commit ? <WholeFileDrawn file={drawn} stepNumber={page.step.number} commit={commit} /> : null}
    </div>
  );
}
