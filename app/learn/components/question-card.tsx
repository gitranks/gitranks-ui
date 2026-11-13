'use client';

import { ArrowRight, Flag, ThumbsDown, ThumbsUp } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';

import { RichText } from './lesson-block';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { LessonQuestion, LessonReportReason, LessonWhy } from '@/lib/learn/learn.types';
import { type OptionMark, optionsOf, pickHintOf, pickOf, REPORT_REASONS, shownOptionsOf } from '@/lib/learn/question';
import { cn } from '@/lib/utils';

/** An option's box for each mark: picked, right, or a wrong pick's hint. */
const OPTION_BOX: Record<OptionMark, string> = {
  plain: '',
  picked: 'border-primary bg-brand-soft/40',
  right: 'border-positive/30 bg-positive/10',
  hint: 'border-warning/40 bg-warning-soft text-warning-soft-foreground',
};

/** The four reasons a question can be reported for, and Send. Drawn in a popover beside Report. */
export function ReportForm({
  onSend,
  onCancel,
  defaultReason,
}: {
  onSend: (reason: LessonReportReason) => Promise<string | null>;
  onCancel: () => void;
  defaultReason?: LessonReportReason;
}) {
  const [reason, setReason] = useState<LessonReportReason | undefined>(defaultReason);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const send = async () => {
    if (!reason) return;
    setSending(true);
    setError(null);
    const failed = await onSend(reason);
    setSending(false);
    if (failed) setError(failed);
  };
  return (
    <div className="flex flex-col gap-3" data-report-form="">
      <div className="flex flex-col gap-1">
        <h3 id={titleId} className="text-sm font-semibold">
          Report this question
        </h3>
        <p className="text-xs text-muted-foreground">
          We skip it and ask you another one. A person reads every report.
        </p>
      </div>
      <RadioGroup
        aria-labelledby={titleId}
        value={reason ?? ''}
        onValueChange={(value) => setReason(value as LessonReportReason)}
        className="gap-2"
      >
        {REPORT_REASONS.map((item) => (
          <label
            key={item.value}
            htmlFor={`${titleId}-${item.value}`}
            className="flex cursor-pointer items-start gap-2.5 text-sm"
          >
            <RadioGroupItem id={`${titleId}-${item.value}`} value={item.value} className="mt-0.5" />
            <span>{item.label}</span>
          </label>
        ))}
      </RadioGroup>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={sending}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={send} disabled={!reason || sending}>
          {sending ? 'Sending…' : 'Send report'}
        </Button>
      </div>
    </div>
  );
}

/**
 * "Good question?" with like and dislike, then Report and its reasons. `liked`: the user's pick so far (null: none).
 * `reportDrawn` draws the reasons open, in place of the popover (the catalogue's boards, which a portal never reaches).
 */
export function QuestionFeedback({
  liked,
  onLike,
  onReport,
  reportDrawn = false,
}: {
  liked: boolean | null;
  onLike: (liked: boolean) => void;
  onReport: (reason: LessonReportReason) => Promise<string | null>;
  reportDrawn?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const report = (
    <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 px-3 text-muted-foreground">
      <Flag aria-hidden="true" className="size-4" />
      Report
    </Button>
  );
  const send = async (reason: LessonReportReason) => {
    const failed = await onReport(reason);
    if (!failed) setOpen(false);
    return failed;
  };
  return (
    <div className="relative flex items-center gap-1 text-xs text-muted-foreground" data-question-feedback="">
      <span className="me-1.5 max-sm:hidden">Good question?</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Good question"
        aria-pressed={liked === true}
        onClick={() => onLike(true)}
        className={cn('size-8 max-sm:size-11', liked === true && 'text-primary')}
      >
        <ThumbsUp aria-hidden="true" className={cn('size-4', liked === true && 'fill-current')} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Bad question"
        aria-pressed={liked === false}
        onClick={() => onLike(false)}
        className={cn('size-8 max-sm:size-11', liked === false && 'text-primary')}
      >
        <ThumbsDown aria-hidden="true" className={cn('size-4', liked === false && 'fill-current')} />
      </Button>
      {reportDrawn ? (
        <>
          {report}
          <div
            role="dialog"
            aria-label="Report this question"
            className="absolute right-0 bottom-full z-50 mb-2 flex w-80 flex-col gap-3 rounded-md border bg-popover p-4 text-popover-foreground shadow-lg"
          >
            <ReportForm onSend={send} onCancel={() => {}} defaultReason="WRONG_KEY" />
          </div>
        </>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{report}</PopoverTrigger>
          <PopoverContent align="end" side="top" className="w-80 shadow-lg">
            <ReportForm onSend={send} onCancel={() => setOpen(false)} />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export type QuestionCardProps = {
  question: LessonQuestion;
  /** Above the prompt: "Question", "Try this one", "Warm-up 1 of 3". */
  label: string;
  /** A warm-up question: "I don't know yet" is its last option, and it is answered with the others. */
  warmup?: boolean;
  picked: readonly string[];
  onPick?: (picked: string[]) => void;
  /** Graded: right shows every option's why; wrong shows the picked ones' as a hint, never the right answer. */
  graded?: { correct: boolean; why: readonly LessonWhy[] } | null;
  /** The question to answer now: ringed, with "Check my answer". */
  current?: boolean;
  onCheck?: () => void;
  checking?: boolean;
  /** Right: the button that moves on ("Next step", "See your result"). */
  onNext?: () => void;
  nextLabel?: string;
  /** A failed check's message, under the button. */
  error?: string | null;
  liked: boolean | null;
  onLike: (liked: boolean) => void;
  onReport: (reason: LessonReportReason) => Promise<string | null>;
  reportDrawn?: boolean;
};

/**
 * One question of a lesson: the prompt, its options as radio buttons (one answer) or checkboxes (several), and below
 * them like, dislike and report. On a step it is answered with "Check my answer": a right answer shows why each
 * option is right or wrong and moves on; a wrong one keeps only the picks, each with why it is not right, and the
 * page asks the step's next question. Nothing fails.
 */
export function QuestionCard({
  question,
  label,
  warmup = false,
  picked,
  onPick,
  graded = null,
  current = false,
  onCheck,
  checking = false,
  onNext,
  nextLabel = 'Next step',
  error,
  liked,
  onLike,
  onReport,
  reportDrawn,
}: QuestionCardProps) {
  const promptId = useId();
  const options = optionsOf(question, warmup);
  const shown = shownOptionsOf(options, picked, graded);
  const locked = !!graded || checking || !onPick;
  const right = graded?.correct === true;

  // A graded or locked card keeps its picks as they were, and reads as it was answered (not greyed out).
  const pick = (optionId: string, on: boolean) => {
    if (!locked) onPick?.(pickOf(question, picked, optionId, on));
  };

  const optionBody = (text: string, why: string | null, mark: OptionMark): ReactNode => (
    <>
      <span className="flex min-w-0 flex-col gap-1">
        <span>
          <RichText text={text} />
        </span>
        {why ? (
          <span className={cn('text-xs', mark !== 'hint' && 'text-muted-foreground')} data-why="">
            <RichText text={why} />
          </span>
        ) : null}
      </span>
      {mark === 'right' ? (
        <span className="ms-auto flex-none font-bold text-positive">
          ✓<span className="sr-only"> Right answer</span>
        </span>
      ) : null}
    </>
  );

  const boxClass = (mark: OptionMark) =>
    cn('flex items-start gap-3 rounded-lg border p-3 text-sm', !locked && 'cursor-pointer', OPTION_BOX[mark]);

  const list =
    question.type === 'SINGLE' ? (
      <RadioGroup
        aria-labelledby={promptId}
        aria-readonly={locked || undefined}
        value={picked[0] ?? ''}
        onValueChange={(value) => pick(value, true)}
        className="gap-2"
      >
        {shown.map(({ option, mark, why }) => (
          <label
            key={option.id}
            htmlFor={`${promptId}-${option.id}`}
            className={boxClass(mark)}
            data-option={option.id}
            data-mark={mark}
          >
            <RadioGroupItem id={`${promptId}-${option.id}`} value={option.id} className="mt-0.5" />
            {optionBody(option.text, why, mark)}
          </label>
        ))}
      </RadioGroup>
    ) : (
      <fieldset aria-labelledby={promptId} className="m-0 grid min-w-0 gap-2 border-0 p-0">
        {shown.map(({ option, mark, why, picked: on }) => (
          <label
            key={option.id}
            htmlFor={`${promptId}-${option.id}`}
            className={boxClass(mark)}
            data-option={option.id}
            data-mark={mark}
          >
            <Checkbox
              id={`${promptId}-${option.id}`}
              checked={on}
              onCheckedChange={(checked) => pick(option.id, checked === true)}
              className="mt-0.5"
            />
            {optionBody(option.text, why, mark)}
          </label>
        ))}
      </fieldset>
    );

  const feedback = <QuestionFeedback liked={liked} onLike={onLike} onReport={onReport} reportDrawn={reportDrawn} />;
  const asking = current && !graded;

  return (
    <section
      className={cn(
        'flex flex-col rounded-xl bg-card p-4.5',
        asking || right ? 'gap-3.5 border-2 border-primary' : 'gap-3 border',
      )}
      data-question={question.id}
      data-graded={graded ? (graded.correct ? 'right' : 'wrong') : undefined}
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{label}</span>
        <h3 id={promptId} className="text-base font-semibold text-balance">
          <RichText text={question.prompt} />
        </h3>
        {current && !warmup && !graded ? (
          <span className="text-xs text-muted-foreground">{pickHintOf(question)}</span>
        ) : null}
      </div>
      {list}
      {asking && onCheck ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="lg"
              onClick={onCheck}
              disabled={checking || !picked.length}
              className="h-10 px-6 font-semibold max-sm:min-h-11"
            >
              {checking ? 'Checking…' : 'Check my answer'}
            </Button>
            {error ? (
              <span role="alert" className="text-sm text-destructive">
                {error}
              </span>
            ) : null}
          </div>
          {feedback}
        </div>
      ) : right && onNext ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" size="lg" onClick={onNext} className="h-10 px-6 font-semibold max-sm:min-h-11">
              {nextLabel}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Button>
            <span className="text-sm font-semibold text-positive-strong" role="status">
              Right.
            </span>
          </div>
          {feedback}
        </div>
      ) : (
        <div className="flex justify-end">{feedback}</div>
      )}
    </section>
  );
}
