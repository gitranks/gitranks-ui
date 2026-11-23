'use client';

import { type LearnAnswer, PICKER } from './use-learn-answer';
import { CodeBox, CodeLine } from '@/components/learn/blocks/code-lines';
import { type HighlightedCode, plainCodeOf } from '@/lib/learn/code-tokens';
import type { LearnAnswerState } from '@/lib/learn/learn-answer';
import {
  codeOf,
  isChoice,
  type LearnCode,
  type LearnQuestion,
  languageNameOf,
  linesOf,
  optionsOf,
  rightOf,
} from '@/lib/learn/learn-question';
import { cn } from '@/lib/utils';

const EYEBROW = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase';

/**
 * The question's code, where the question needs it read: "Read this code" for `predict-output` (with what it prints
 * once the answer is known), "Click a line" for `pick-line` (each line a button), and the plain example for the other
 * kinds when the place has no lesson to show it in (`withExample`: the review, the check). Nothing otherwise. The
 * server's highlighted code is drawn when it has the language shown, else the plain code.
 */
export function QuestionPart({
  question,
  answer,
  withExample = false,
  highlighted = [],
  className,
}: {
  question: LearnQuestion;
  answer: Pick<LearnAnswer, 'state' | 'language' | 'pick'>;
  withExample?: boolean;
  /** The question's code as the server highlighted it, one entry a language. */
  highlighted?: readonly HighlightedCode[];
  className?: string;
}) {
  const code = codeOf(question, answer.language);
  if (!code) return null;
  const lines = linesFor(code, highlighted);
  if (question.type === 'PICK_LINE') {
    return (
      <figure className={cn('m-0 flex flex-col gap-2', className)} data-question-code="line">
        <span className={EYEBROW}>Click a line</span>
        <LinePick code={lines} answer={answer} />
      </figure>
    );
  }
  if (question.type === 'PREDICT_OUTPUT') {
    const output = outputOf(question, answer.state, code.language);
    return (
      <figure className={cn('m-0 flex flex-col gap-2', className)} data-question-code="output">
        <span className={EYEBROW}>Read this code</span>
        <CodeBox code={lines} />
        {output !== null ? (
          <div
            className="flex items-center justify-between gap-3 rounded-lg bg-foreground px-4 py-2.5 font-mono text-sm text-background"
            data-question-output=""
          >
            <span className="opacity-60">Output</span>
            <span className="font-semibold whitespace-pre-wrap">{output}</span>
          </div>
        ) : null}
      </figure>
    );
  }
  if (!withExample) return null;
  return (
    <figure className={cn('m-0 flex flex-col gap-2', className)} data-question-code="example">
      <span className={EYEBROW}>Example · {languageNameOf(code.language)}</span>
      <CodeBox code={lines} />
    </figure>
  );
}

/**
 * The code's lines as drawn: the server's colours when it has them for this language and they count the same lines as
 * the code (the number keys and the right line count those), else the plain code.
 */
function linesFor(code: LearnCode, highlighted: readonly HighlightedCode[]): HighlightedCode {
  const found = highlighted.find((entry) => entry.language === code.language);
  return found && found.lines.length === linesOf(code.code).length ? found : plainCodeOf(code);
}

/** What the code prints, once the answer is done and the key is known: the right option's text. */
function outputOf(question: LearnQuestion, state: LearnAnswerState, language: string): string | null {
  if (state.phase !== 'done' || !state.key || !isChoice(question.type)) return null;
  const right = rightOf(state.key, language);
  if (right?.kind !== 'options' || right.indexes.length !== 1) return null;
  return optionsOf(state.key)[right.indexes[0]]?.text ?? null;
}

/** How a line is marked: picked, crossed out by a wrong pick, or right once the answer is done. */
type LineMark = 'plain' | 'picked' | 'wrong' | 'right';

const LINE_MARK: Record<LineMark, string> = {
  plain: 'hover:bg-muted',
  picked: 'bg-brand-soft shadow-[inset_3px_0_0_var(--primary)]',
  wrong: 'bg-warning-soft text-warning-soft-foreground shadow-[inset_3px_0_0_var(--warning)]',
  right: 'bg-positive/10 text-positive shadow-[inset_3px_0_0_var(--positive)]',
};

export function lineMarkOf(state: LearnAnswerState, line: number, rightLine: number | null): LineMark {
  if (state.struck.includes(line)) return 'wrong';
  if (state.phase === 'done') {
    if (line === rightLine) return 'right';
    if (state.picked === line) return state.shown?.right ? 'right' : 'wrong';
    return 'plain';
  }
  return state.picked === line ? 'picked' : 'plain';
}

/** The code as numbered lines, each a button that picks it. A crossed-out line cannot be picked again. */
function LinePick({
  code,
  answer,
}: {
  code: HighlightedCode;
  answer: Pick<LearnAnswer, 'state' | 'language' | 'pick'>;
}) {
  const { state } = answer;
  const right = state.phase === 'done' && state.key ? rightOf(state.key, answer.language) : null;
  const rightLine = right?.kind === 'line' ? right.line : null;
  const open = state.phase === 'open';
  return (
    <fieldset
      className="m-0 min-w-0 overflow-x-auto rounded-lg border bg-muted/50 px-0 py-2"
      aria-label="The code: pick a line"
    >
      {code.lines.map((tokens, index) => {
        const line = index + 1;
        const mark = lineMarkOf(state, line, rightLine);
        return (
          <button
            // Lines never move: the number is the line.
            key={line}
            type="button"
            aria-pressed={mark === 'picked'}
            disabled={!open || mark === 'wrong'}
            onClick={() => answer.pick(index)}
            data-line={line}
            {...{ [PICKER]: '' }}
            data-line-mark={mark}
            className={cn(
              'grid w-full grid-cols-[36px_1fr] items-start border-0 bg-transparent py-1 pr-3 pl-0 text-left font-mono text-sm leading-[1.6] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-default',
              LINE_MARK[mark],
            )}
          >
            <span className="pt-0.5 text-center text-xs text-muted-foreground">{line}</span>
            <span className={cn('whitespace-pre', mark === 'wrong' && 'line-through')}>
              <CodeLine tokens={tokens} plain={mark === 'right' || mark === 'wrong'} />
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}
