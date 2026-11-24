'use client';

import { Check } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';

import {
  FixStateView,
  factsOf,
  WALKTHROUGH_GRID,
  WALKTHROUGH_MAIN,
  WalkthroughHead,
  WalkthroughPartArticle,
  walkthroughCrumbsOf,
} from './walkthrough-parts';
import { useEnter } from '@/components/learn/player/use-page-keys';
import { Kbd } from '@/components/learn/question/kbd';
import { Button } from '@/components/ui/button';
import { PlayerRunEnd, PlayerStrip } from '@/components/workspace/player/player-strip';
import { LEARN_ANSWERS_SHARE_SWITCH_ON } from '@/lib/learn/built-pages';
import { learnFixMinePath, learnFixWalkthroughPath } from '@/lib/learn/paths';
import { useKeyHints } from '@/lib/learn/use-key-hints';
import {
  answeredDateOf,
  type FixMine,
  questionsWordsOf,
  rightWhyOf,
  sameLogin,
  triesOf,
  triesSummaryOf,
  triesWordsOf,
  type Walkthrough,
  type WalkthroughAnswer,
  type WalkthroughAnswers,
  type WalkthroughQuestion,
} from '@/lib/learn/walkthrough';
import { shareAnswersAction } from '@/lib/learn/walkthrough.actions';
import { hasSessionHint } from '@/lib/session-hint';
import { cn } from '@/lib/utils';
import { contributeErrorMessage } from '@/lib/workspace/errors';
import type { PrRef } from '@/lib/workspace/pr-feedback';

/** The signed-in person's side of a fix from their route; both null signed out and on any failure. */
export async function readFixMine(
  pr: PrRef,
  { answersOf }: { answersOf?: string } = {},
): Promise<{ mine: FixMine | null; answers: WalkthroughAnswers | null }> {
  try {
    const res = await fetch(learnFixMinePath(pr, { answersOf }), { cache: 'no-store' });
    if (!res.ok) return { mine: null, answers: null };
    const read = (await res.json()) as { mine?: FixMine | null; answers?: WalkthroughAnswers | null };
    return { mine: read.mine ?? null, answers: read.answers ?? null };
  } catch {
    return { mine: null, answers: null };
  }
}

/** A question answered, as everyone reads it: the right answer marked, its reason, and how many tries it took. */
export function AnsweredQuestion({
  question,
  index,
  count,
  tries,
  who,
}: {
  question: WalkthroughQuestion;
  index: number;
  count: number;
  tries: number | null;
  /** "alice", or "You" on the fixer's own page. */
  who: string;
}) {
  const why = rightWhyOf(question);
  const first = tries === 1;
  return (
    <section className="flex flex-col gap-3.5 rounded-xl border bg-card p-4.5" data-answered-question={index + 1}>
      <p className="m-0 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Question {index + 1} of {count}
      </p>
      <h3 className="m-0 text-base font-semibold text-balance">{question.prompt}</h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {question.options.map((option) => (
          <li
            key={option.id}
            className={cn(
              'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm',
              option.right ? 'border-positive/30 bg-positive/10' : 'opacity-60',
            )}
            data-right={option.right || undefined}
          >
            {option.right ? (
              <Check className="mt-0.5 size-4 shrink-0 text-positive" aria-label="The right answer" />
            ) : (
              <span className="size-4 shrink-0" aria-hidden="true" />
            )}
            <span className="min-w-0">{option.text}</span>
          </li>
        ))}
      </ul>
      {why ? (
        <p className="m-0 text-sm" data-answer-why="">
          <b className="font-semibold text-positive">Right.</b> <span className="text-muted-foreground">{why}</span>
        </p>
      ) : null}
      {tries ? (
        <p className="m-0 flex items-center gap-1.5 border-t pt-3 text-sm text-muted-foreground" data-tries={tries}>
          <Check
            aria-hidden="true"
            className={cn('size-4 shrink-0', first ? 'text-positive' : 'text-muted-foreground')}
          />
          <span>
            <b className="font-semibold text-foreground">{who}</b> picked it {triesWordsOf(tries)}.
          </span>
        </p>
      ) : null}
    </section>
  );
}

/** How the page speaks of whose answers they are. */
type Whose = { own: boolean; login: string; fixer: boolean };

/** "alice answered these 4 questions on 24 Nov 2026, before the pull request opened: 3 on the first try, …" */
function answeredWordsOf(whose: Whose, count: number, passedAt: string | null, answers: readonly WalkthroughAnswer[]) {
  const who = whose.own ? 'You' : whose.login;
  const date = answeredDateOf(passedAt);
  const summary = triesSummaryOf(answers);
  return `${who} answered these ${questionsWordsOf(count)}${date ? ` on ${date}` : ''}${whose.fixer ? ', before the pull request opened' : ''}${summary ? `: ${summary}` : ''}. Nobody can change the answers, ${whose.own ? 'you' : whose.login} included.`;
}

/** The fixer's switch: stop sharing, or share again. */
function ShareSwitch({
  pr,
  shared,
  onChanged,
}: {
  pr: PrRef;
  shared: boolean;
  onChanged: (answers: WalkthroughAnswers) => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        className="h-8 px-3 text-[13px] max-sm:min-h-11"
        data-share-switch={shared ? 'stop' : 'share'}
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await shareAnswersAction(pr, !shared);
            if (!result.ok) setError(contributeErrorMessage(result.error, result.message));
            else if (result.data) onChanged(result.data);
          })
        }
      >
        {shared ? 'Stop sharing' : 'Share them again'}
      </Button>
      {error ? (
        <p className="m-0 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** "The answers are on this page": a signed-in reader who has not answered may try the questions first. */
function TryFirst({ href }: { href: Route }) {
  const router = useRouter();
  const hints = useKeyHints();
  useEnter(useCallback(() => router.push(href), [router, href]));
  return (
    <section
      className="flex flex-col gap-3 rounded-xl border border-primary bg-card p-5 ring-1 ring-primary ring-inset"
      data-try-first=""
    >
      <h2 className="m-0 text-base font-semibold">The answers are on this page</h2>
      <p className="m-0 text-sm text-muted-foreground">
        You have not answered this walkthrough yet. To try the questions first, start it now.
      </p>
      <Button asChild className="min-h-9 self-start px-4 font-semibold max-sm:w-full max-sm:min-h-11">
        <Link href={href} prefetch={false}>
          Answer them yourself
          {hints ? <Kbd>⏎</Kbd> : null}
        </Link>
      </Button>
    </section>
  );
}

/** The fixer's walkthrough is held while reports on its questions are looked at: what that means for them. */
const HeldNote = () => (
  <p className="m-0 rounded-lg border bg-card px-4 py-3 text-sm" data-held-note="">
    <b className="font-semibold">This walkthrough is paused.</b>{' '}
    <span className="text-muted-foreground">
      Readers reported a mistake in its questions, and we are checking them. This is the walkthrough of your fix. Your
      answers and your pull request are not affected.
    </span>
  </p>
);

/** The answers drawn: the facts and the title, who answered and how, then every part with its question answered. */
export function AnswersScreen({
  pr,
  answers,
  walkthrough,
  own,
  mine,
  onShared,
}: {
  pr: PrRef;
  answers: WalkthroughAnswers;
  walkthrough: Walkthrough;
  own: boolean;
  mine: FixMine | null;
  onShared?: (answers: WalkthroughAnswers) => void;
}) {
  const list = answers.answers ?? [];
  const count = walkthrough.parts.length;
  const href = learnFixWalkthroughPath(pr);
  const whose: Whose = { own, login: answers.login, fixer: sameLogin(answers.login, walkthrough.fixer) };
  const crumbs = [
    ...walkthroughCrumbsOf(walkthrough, href),
    { label: own ? 'Your answers' : `${answers.login}’s answers` },
  ];
  const reader = !!mine && !own && !mine.fixer && !mine.passedAt;
  const squares = walkthrough.parts.map(() => 'right' as const);
  let title = `How ${answers.login} answered`;
  if (own) title = answers.shared ? 'Your answers, as others see them' : 'Your answers';
  return (
    <>
      <PlayerStrip
        crumbs={crumbs}
        end={<PlayerRunEnd squares={squares} words={{ lead: '', number: count, tail: ` of ${count} answered` }} />}
      />
      <main className={WALKTHROUGH_MAIN} data-walkthrough-answers={own ? 'own' : 'shared'}>
        <div className="flex flex-col gap-6">
          <WalkthroughHead facts={factsOf(walkthrough)} />
          {own && mine?.held ? <HeldNote /> : null}
          {reader ? <TryFirst href={href} /> : null}
          <section className="flex flex-col gap-3 rounded-xl border bg-card p-5" data-answers-who="">
            <h2 className="m-0 text-base font-semibold">{title}</h2>
            {own && !answers.shared ? (
              <p className="m-0 text-sm text-muted-foreground">
                Only you can see your answers now. Other people see the questions without them.
              </p>
            ) : null}
            <p className="m-0 text-sm text-muted-foreground">{answeredWordsOf(whose, count, answers.passedAt, list)}</p>
            {own && answers.shared ? (
              <p className="m-0 text-sm text-muted-foreground">Shared with everyone who opens your fix’s page.</p>
            ) : null}
            {own && LEARN_ANSWERS_SHARE_SWITCH_ON && onShared ? (
              <ShareSwitch pr={pr} shared={answers.shared} onChanged={onShared} />
            ) : null}
            {!own && !reader ? (
              <Button asChild variant="outline" className="h-8 self-start px-3 text-[13px] max-sm:min-h-11">
                <Link href={href} prefetch={false}>
                  Answer them yourself
                </Link>
              </Button>
            ) : null}
          </section>
          {walkthrough.parts.map((part, index) => (
            <div key={part.id} className={cn('border-t pt-8', WALKTHROUGH_GRID)}>
              <WalkthroughPartArticle heading={part.heading} blocks={part.blocks} index={index} count={count} />
              <AnsweredQuestion
                question={part.question}
                index={index}
                count={count}
                tries={triesOf(list, part.question.id)}
                who={own ? 'You' : answers.login}
              />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

/** A person's answers the page cannot show: kept private by the fixer (or the walkthrough held). */
export function AnswersPrivate({ pr, login, mine }: { pr: PrRef; login: string; mine?: FixMine | null }) {
  return (
    <>
      <PlayerStrip
        crumbs={[...walkthroughCrumbsOf(null, learnFixWalkthroughPath(pr)), { label: `${login}’s answers` }]}
      />
      <FixStateView
        state="private"
        eyebrow="A fix walkthrough"
        title={`${login} keeps their answers private`}
        lead="The questions are open to everyone, and you can answer them yourself."
        action={{ label: 'Answer them yourself', href: learnFixWalkthroughPath(pr) }}
      >
        {mine?.held ? <HeldNote /> : null}
      </FixStateView>
    </>
  );
}

/** Answers the public read did not bring (a read that failed, a walkthrough not open): the way to the walkthrough. */
export const AnswersNotHere = ({ pr }: { pr: PrRef }) => (
  <FixStateView
    state="not-here"
    eyebrow="A fix walkthrough"
    title="These answers are not here right now"
    lead="The walkthrough may be paused while we check its questions."
    action={{ label: 'Open the walkthrough', href: learnFixWalkthroughPath(pr) }}
  />
);

/**
 * A person's answers (page 13), read, not worked: the parts one under another, each question with its right answer
 * and how many tries it took. The page is the same for everyone (`initial`, cached); once up, a signed-in person's
 * side is read in the browser: the fixer sees their own answers, shared or not, with the switch; a reader who has not
 * answered is offered to try the questions first.
 */
export function AnswersLive({
  pr,
  login,
  initial,
}: {
  pr: PrRef;
  login: string;
  /** Null when the public read did not come: the fixer's own still may. */
  initial: WalkthroughAnswers | null;
}) {
  const [mine, setMine] = useState<FixMine | null>(null);
  const [own, setOwn] = useState<WalkthroughAnswers | null>(null);

  // The pull request by its two values: a new object for the same one reads nothing again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `pr` is named by its two values.
  useEffect(() => {
    if (!hasSessionHint(document.cookie)) return;
    let live = true;
    // The page's own login: the route reads the answers only when it is the signed-in person's.
    readFixMine(pr, { answersOf: login }).then((read) => {
      if (!live) return;
      setMine(read.mine);
      if (read.mine?.fixer && read.answers && sameLogin(read.answers.login, login)) setOwn(read.answers);
    });
    return () => {
      live = false;
    };
  }, [pr.nameWithOwner, pr.number, login]);

  if (own?.walkthrough) {
    return <AnswersScreen pr={pr} answers={own} walkthrough={own.walkthrough} own mine={mine} onShared={setOwn} />;
  }
  if (!initial) return <AnswersNotHere pr={pr} />;
  if (!initial.walkthrough) return <AnswersPrivate pr={pr} login={initial.login} mine={mine} />;
  return <AnswersScreen pr={pr} answers={initial} walkthrough={initial.walkthrough} own={false} mine={mine} />;
}
