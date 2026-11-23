'use client';

import { Check, ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react';
import { type ReactNode, useId, useRef } from 'react';

import { Kbd, KeyLine, type KeyLineItem } from './kbd';
import { QuestionPart } from './question-part';
import type { LearnAnswer } from './use-learn-answer';
import { RichText } from '@/components/learn/rich-text';
import { Button } from '@/components/ui/button';
import { type LearnAnswerState, pickCountOf } from '@/lib/learn/learn-answer';
import {
  againNoteOf,
  isChoice,
  type LearnQuestion,
  type LearnQuestionType,
  MISSED_NOTE,
  OUT_OF_ORDER_NOTE,
  openNoteOf,
  optionsOf,
  orderItemsOf,
  QUESTION_TYPE_LABELS,
  rightOf,
} from '@/lib/learn/learn-question';
import { useKeyHints } from '@/lib/learn/use-key-hints';
import { cn } from '@/lib/utils';

/** What differs between the places that ask: the extra choice, whether a verdict shows, the button's words. */
export type AnswerPartPlace = {
  /** "I don't know" on the check, "I don't remember" on the review; none on a lesson. */
  extra?: string;
  /** Whether a verdict shows: a lesson and the review give one, the check does not. */
  verdict: boolean;
  /** The main button before the answer ("Check", "Next question") and once it is done ("Next: Hash maps"). */
  labels: { check: string; done: string };
  /** What the status slot says before an answer, in place of the kind's own words. */
  note?: string;
  /** Draw the question's code in the card: a place with no lesson beside it (the review, the check). */
  withCode?: boolean;
};

/**
 * The answer part: the card that asks one question of any kind and gives its verdict, and the line of keys under it.
 * Every place that asks draws this one card; it holds no state of its own (`useLearnAnswer` does), so the catalogue
 * draws every state from a fixture.
 */
export function AnswerPart({
  question,
  answer,
  place,
  hints: hintsGiven,
  keyLineEnd,
}: {
  question: LearnQuestion;
  answer: LearnAnswer;
  place: AnswerPartPlace;
  /** Key hints shown or not, for the catalogue; the site's one answer otherwise. */
  hints?: boolean;
  /** What sits at the end of the line of keys (the check's "Stop and see the result"). */
  keyLineEnd?: ReactNode;
}) {
  const live = useKeyHints();
  const hints = hintsGiven ?? live;
  const titleId = useId();
  const { state } = answer;
  const myth = question.type === 'MYTH_OR_FACT';
  const done = state.phase === 'done';
  const oneShot = myth && place.verdict;
  const label = done || oneShot ? place.labels.done : place.labels.check;
  const enabled = done || (!oneShot && answer.canSend);
  const keyLine = <KeyLine items={keyLineOf(question, state, place, answer.language)} hints={hints} />;

  return (
    <>
      <section
        className="flex flex-col gap-3.5 rounded-xl border-2 border-primary bg-card p-4.5"
        aria-labelledby={titleId}
        data-answer-part={question.type}
        data-answer-phase={state.phase}
      >
        <div className="flex flex-col gap-1">
          <span className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Question</span>
            <span className="rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground">
              {QUESTION_TYPE_LABELS[question.type]}
            </span>
          </span>
          <h2 id={titleId} className="m-0 text-base font-semibold text-balance">
            {myth ? 'Myth or fact?' : <RichText text={question.prompt} />}
          </h2>
        </div>
        {place.withCode ? <QuestionPart question={question} answer={answer} withExample /> : null}
        <AnswerBody question={question} answer={answer} place={place} hints={hints} titleId={titleId} />
        <Status question={question} state={state} place={place} />
        <Button
          type="button"
          size="lg"
          className="w-full font-semibold"
          disabled={!enabled}
          aria-busy={state.phase === 'sending' || undefined}
          onClick={answer.main}
          data-answer-main=""
        >
          {label}
          {hints ? <Kbd onPrimary>⏎</Kbd> : null}
        </Button>
      </section>
      {keyLineEnd ? (
        <div className="flex min-h-9 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {keyLine}
          {keyLineEnd}
        </div>
      ) : (
        keyLine
      )}
    </>
  );
}

/** The part of the card that is picked from, by kind. */
function AnswerBody({
  question,
  answer,
  place,
  hints,
  titleId,
}: {
  question: LearnQuestion;
  answer: LearnAnswer;
  place: AnswerPartPlace;
  hints: boolean;
  titleId: string;
}) {
  if (isChoice(question.type)) {
    return <Options question={question} answer={answer} extra={place.extra} hints={hints} titleId={titleId} />;
  }
  const extra = place.extra ? (
    <ExtraRow answer={answer} label={place.extra} hints={hints} radio={false} name={titleId} />
  ) : null;
  if (question.type === 'PICK_LINE') {
    return (
      <>
        <YourPick state={answer.state} extra={place.extra} />
        {extra}
      </>
    );
  }
  if (question.type === 'PUT_IN_ORDER') {
    return (
      <>
        <OrderList question={question} answer={answer} />
        {extra}
      </>
    );
  }
  return (
    <>
      <MythButtons question={question} answer={answer} hints={hints} />
      {extra}
    </>
  );
}

/** How an option is marked: picked; right or crossed out by a verdict; or set aside once the answer is done. */
export type OptionMark = 'plain' | 'picked' | 'right' | 'wrong' | 'rest';

const OPTION_MARK: Record<OptionMark, string> = {
  plain: '',
  picked: 'border-primary bg-brand-soft/40',
  right: 'border-positive/30 bg-positive/10',
  wrong: 'border-warning/40 bg-warning-soft text-warning-soft-foreground',
  rest: 'opacity-55',
};

const isPicked = (state: LearnAnswerState, index: number) =>
  Array.isArray(state.picked) ? (state.picked as unknown[]).includes(index) : state.picked === index;

/**
 * An option's mark. Before the answer is done: picked or not, and crossed out once a pick showed it wrong. Once done:
 * the right ones marked right (when the key is known), a wrong pick crossed out, the rest set aside. A wrong pick
 * that may be tried again never shows which one is right.
 */
export function optionMarkOf(state: LearnAnswerState, index: number, language: string | null): OptionMark {
  if (state.struck.includes(index)) return 'wrong';
  if (state.phase !== 'done') return isPicked(state, index) ? 'picked' : 'plain';
  const right = state.key ? rightOf(state.key, language) : null;
  if (right?.kind === 'options') {
    if (right.indexes.includes(index)) return 'right';
    return isPicked(state, index) ? 'wrong' : 'rest';
  }
  return isPicked(state, index) ? 'picked' : 'rest';
}

function MarkIcon({ mark }: { mark: OptionMark }) {
  if (mark === 'right') return <Check className="mt-0.5 size-4 shrink-0 text-positive" aria-label="Right" />;
  if (mark === 'wrong') return <X className="mt-0.5 size-4 shrink-0" aria-label="Wrong" />;
  return null;
}

/** The round or square box before an option, as the kind picks one or many. */
function Indicator({ multi, on }: { multi: boolean; on: boolean }) {
  if (multi) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-sm border border-muted-foreground',
          on && 'border-primary bg-primary text-primary-foreground',
        )}
      >
        {on ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground shadow-xs',
        on && 'border-primary',
      )}
    >
      {on ? <span className="size-2 rounded-full bg-primary" /> : null}
    </span>
  );
}

const ROW =
  'flex items-start gap-3 rounded-lg border p-3 text-sm has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50';

/** The options of `pick-one`, `pick-all` and `predict-output`, then the place's extra choice. */
function Options({
  question,
  answer,
  extra,
  hints,
  titleId,
}: {
  question: LearnQuestion;
  answer: LearnAnswer;
  extra: string | undefined;
  hints: boolean;
  titleId: string;
}) {
  const multi = question.type === 'PICK_ALL';
  const mono = question.type === 'PREDICT_OUTPUT';
  const open = answer.state.phase === 'open';
  return (
    <fieldset className="m-0 grid min-w-0 gap-2 border-0 p-0" aria-labelledby={titleId}>
      {optionsOf(question).map((option, index) => {
        const mark = optionMarkOf(answer.state, index, answer.language);
        const pickable = open && mark !== 'wrong';
        return (
          // Options never move: the index is the option, as the pick is sent.
          <label
            key={index}
            className={cn(ROW, pickable && 'cursor-pointer hover:bg-accent/40', OPTION_MARK[mark])}
            data-option={index}
            data-option-mark={mark}
          >
            <input
              type={multi ? 'checkbox' : 'radio'}
              name={titleId}
              className="sr-only"
              checked={isPicked(answer.state, index)}
              disabled={!pickable}
              onChange={() => answer.pick(index)}
            />
            {mark === 'right' || mark === 'wrong' ? (
              <MarkIcon mark={mark} />
            ) : (
              <Indicator multi={multi} on={isPicked(answer.state, index)} />
            )}
            <span className={cn('min-w-0 flex-1', mono && 'font-mono', mark === 'wrong' && 'line-through')}>
              <RichText text={option.text} />
            </span>
            {hints ? <Kbd className={cn(mark !== 'plain' && mark !== 'picked' && 'invisible')}>{index + 1}</Kbd> : null}
          </label>
        );
      })}
      {extra ? <ExtraRow answer={answer} label={extra} hints={hints} radio={!multi} name={titleId} /> : null}
    </fieldset>
  );
}

/** The place's extra choice, drawn as the last option: its words muted, the key 0. */
function ExtraRow({
  answer,
  label,
  hints,
  radio,
  name,
}: {
  answer: LearnAnswer;
  label: string;
  hints: boolean;
  radio: boolean;
  name: string;
}) {
  const { state } = answer;
  const open = state.phase === 'open';
  const mark: OptionMark = state.extra ? 'picked' : state.phase === 'done' ? 'rest' : 'plain';
  return (
    <label
      className={cn(ROW, open && 'cursor-pointer hover:bg-accent/40', OPTION_MARK[mark])}
      data-option="extra"
      data-option-mark={mark}
    >
      <input
        type={radio ? 'radio' : 'checkbox'}
        name={name}
        className="sr-only"
        checked={state.extra}
        disabled={!open}
        onChange={answer.extra}
      />
      <Indicator multi={false} on={state.extra} />
      <span className="min-w-0 flex-1 text-muted-foreground">{label}</span>
      {hints ? <Kbd className={cn(!open && 'invisible')}>0</Kbd> : null}
    </label>
  );
}

/** `pick-line`'s row in the card: the line picked in the code, or what to do. */
function YourPick({ state, extra }: { state: LearnAnswerState; extra: string | undefined }) {
  const again = state.phase === 'open' && state.shown && !state.shown.right;
  const value =
    state.extra && extra
      ? extra
      : typeof state.picked === 'number'
        ? `Line ${state.picked}`
        : again
          ? 'Pick another line'
          : 'None yet';
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm" data-your-pick="">
      <span className="text-muted-foreground">Your pick</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}

/**
 * `put-in-order`'s rows: dragged, or picked by number (or a click on its text) and moved with the arrow keys or the
 * row's own buttons. Once right, the rows are marked right and keep their places; the buttons keep their space.
 */
function OrderList({ question, answer }: { question: LearnQuestion; answer: LearnAnswer }) {
  const { state } = answer;
  const open = state.phase === 'open';
  const texts = new Map(orderItemsOf(question).map((item) => [item.id, item.text]));
  const ids = Array.isArray(state.picked) ? (state.picked as string[]) : [];
  const right = state.phase === 'done' && state.shown?.right;
  const dragged = useRef<number | null>(null);
  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Rows to put in order">
      {ids.map((id, index) => {
        const selected = open && state.selected === index;
        return (
          <li
            key={id}
            draggable={open}
            onDragStart={(event) => {
              dragged.current = index;
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', String(index));
            }}
            onDragOver={(event) => {
              if (open && dragged.current !== null) event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (dragged.current !== null) answer.move(dragged.current, index);
              dragged.current = null;
            }}
            onDragEnd={() => {
              dragged.current = null;
            }}
            data-order-row={id}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-2.5 text-sm',
              selected && 'border-primary bg-brand-soft/40',
              right && 'border-positive/30 bg-positive/10',
              open && 'cursor-grab',
            )}
          >
            {right ? (
              <Check className="size-[15px] shrink-0 text-positive" aria-hidden="true" />
            ) : (
              <GripVertical className="size-[15px] shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              {index + 1}
            </span>
            <button
              type="button"
              className="min-w-0 flex-1 cursor-[inherit] border-0 bg-transparent p-0 text-left outline-none focus-visible:underline"
              aria-pressed={selected}
              disabled={!open}
              onClick={() => answer.pick(index)}
            >
              <RichText text={texts.get(id) ?? id} />
            </button>
            <span className={cn('flex shrink-0 gap-0.5', !open && 'invisible')}>
              <Button
                type="button"
                variant="ghost"
                className="size-7 p-0"
                aria-label="Move up"
                disabled={!open || index === 0}
                onClick={() => answer.move(index, index - 1)}
              >
                <ChevronUp className="size-[15px]" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="size-7 p-0"
                aria-label="Move down"
                disabled={!open || index === ids.length - 1}
                onClick={() => answer.move(index, index + 1)}
              >
                <ChevronDown className="size-[15px]" />
              </Button>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** How myth or fact is marked, as an option is. */
export function mythMarkOf(state: LearnAnswerState, choice: 'myth' | 'fact', language: string | null): OptionMark {
  if (state.phase !== 'done') return state.picked === choice ? 'picked' : 'plain';
  const right = state.key ? rightOf(state.key, language) : null;
  if (right?.kind === 'myth') {
    if (right.answer === choice) return 'right';
    return state.picked === choice ? 'wrong' : 'rest';
  }
  return state.picked === choice ? 'picked' : 'rest';
}

/** `myth-or-fact`: the statement, then Myth and Fact, one press each. */
function MythButtons({ question, answer, hints }: { question: LearnQuestion; answer: LearnAnswer; hints: boolean }) {
  const open = answer.state.phase === 'open';
  return (
    <>
      <p className="m-0 rounded-lg border p-4 text-base font-medium text-balance">
        “<RichText text={question.prompt} />”
      </p>
      <div className="grid grid-cols-2 gap-2">
        {(['myth', 'fact'] as const).map((choice) => {
          const mark = mythMarkOf(answer.state, choice, answer.language);
          return (
            <Button
              key={choice}
              type="button"
              variant="outline"
              aria-pressed={answer.state.picked === choice}
              aria-disabled={!open || undefined}
              onClick={() => (open ? answer.myth(choice) : undefined)}
              data-myth={choice}
              data-option-mark={mark}
              className={cn('h-12 text-[15px] font-semibold', OPTION_MARK[mark], !open && 'cursor-default')}
            >
              <MarkIcon mark={mark} />
              <span className={cn(mark === 'wrong' && 'line-through')}>{choice === 'myth' ? 'Myth' : 'Fact'}</span>
              {hints ? <Kbd className={cn(!open && 'invisible')}>{choice === 'myth' ? 'M' : 'F'}</Kbd> : null}
            </Button>
          );
        })}
      </div>
    </>
  );
}

/** The status slot: what to do, why a pick is wrong, why the answer is right. It keeps its size. */
function Status({
  question,
  state,
  place,
}: {
  question: LearnQuestion;
  state: LearnAnswerState;
  place: AnswerPartPlace;
}) {
  const { tone, lead, text } = statusOf(question.type, state, place);
  return (
    <p
      role="status"
      className={cn(
        'm-0 min-h-[84px] rounded-lg p-3 text-sm',
        tone === 'neutral' && 'bg-muted/50 text-muted-foreground',
        tone === 'wrong' && 'bg-warning-soft text-warning-soft-foreground',
        tone === 'right' && 'bg-positive/10 text-positive',
      )}
      data-status={tone}
    >
      {lead ? <b className="font-semibold">{lead}</b> : null}
      {lead && text ? ' ' : null}
      {text ? <RichText text={text} /> : null}
    </p>
  );
}

/** What the status slot says, from the answer's state: its tone, a bold lead, and the text after it. */
export function statusOf(
  type: LearnQuestionType,
  state: LearnAnswerState,
  place: Pick<AnswerPartPlace, 'note'>,
): { tone: 'neutral' | 'wrong' | 'right'; lead: string | null; text: string | null } {
  if (state.failed) return { tone: 'wrong', lead: 'Not sent.', text: 'Your answer did not reach us. Try again.' };
  if (state.phase === 'sending') return { tone: 'neutral', lead: null, text: 'Sending your answer…' };
  const shown = state.shown;
  if (state.phase === 'done' && shown) {
    if (shown.extra) return { tone: 'neutral', lead: 'Here is the answer.', text: shown.why };
    if (shown.right) return { tone: 'right', lead: 'Right.', text: shown.why };
    return { tone: 'wrong', lead: 'Not quite.', text: shown.why };
  }
  if (state.phase === 'open' && shown && !shown.right) {
    const why = shown.why ?? (shown.missed ? MISSED_NOTE : type === 'PUT_IN_ORDER' ? OUT_OF_ORDER_NOTE : null);
    return { tone: 'wrong', lead: 'Not quite.', text: [why, againNoteOf(type)].filter(Boolean).join(' ') };
  }
  return { tone: 'neutral', lead: null, text: place.note ?? openNoteOf(type, state.picked) };
}

/** The keys of a number of things: each one up to four, else the first, an ellipsis, and the last. */
const numberKeysOf = (count: number) =>
  count <= 4 ? Array.from({ length: count }, (_, index) => String(index + 1)) : ['1', '…', String(count)];

/** The line of keys for a question in its state: what picks, the extra choice, and the main key. */
export function keyLineOf(
  question: LearnQuestion,
  state: LearnAnswerState,
  place: Pick<AnswerPartPlace, 'extra' | 'verdict'>,
  language: string | null,
): KeyLineItem[] {
  const next = state.phase === 'done' || !place.verdict || question.type === 'MYTH_OR_FACT';
  const main: KeyLineItem = { keys: ['⏎'], does: next ? 'next' : 'check' };
  if (state.phase === 'done') return [main];
  const items: KeyLineItem[] = [];
  if (isChoice(question.type)) {
    const count = optionsOf(question).length;
    items.push({ keys: numberKeysOf(count), does: question.type === 'PICK_ALL' ? 'pick or unpick' : 'pick' });
  } else if (question.type === 'PICK_LINE') {
    items.push({ keys: numberKeysOf(Math.min(9, pickCountOf(question, language))), does: 'pick a line' });
  } else if (question.type === 'PUT_IN_ORDER') {
    items.push({ keys: numberKeysOf(orderItemsOf(question).length), does: 'pick a row' });
    items.push({ keys: ['↑', '↓'], does: 'move it' });
  } else {
    items.push({ keys: ['M'], does: 'myth' }, { keys: ['F'], does: 'fact' });
  }
  if (place.extra) items.push({ keys: ['0'], does: place.extra });
  return [...items, main];
}
