'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { FaGithub } from 'react-icons/fa';

import { reactOnReturn, reactToLessonResult, signInToReact } from '../actions';
import { avatarOf } from './lesson-header';
import { GithubAvatar } from '@/app/components/landing/landing-ui';
import { reportLearnEvent } from '@/components/contribute-click-tracker/contribute-click-tracker';
import { Button } from '@/components/ui/button';
import { MAINTAINERS_REPORT_PATH } from '@/lib/contribute/contribute-path';
import type { LessonReaction, LessonResultReaction } from '@/lib/learn/learn.types';
import {
  ownResultLineOf,
  reactionErrorMessage,
  reactionOutcomeOf,
  reactionRoleOf,
  reactionWordsOf,
} from '@/lib/learn/lesson-public';
import { dropReturnQuery, settleReturnedPick } from '@/lib/learn/react-return';
import { cn } from '@/lib/utils';

const BUTTONS: { value: LessonReaction; label: string; Icon: typeof ThumbsUp }[] = [
  { value: 'YES', label: 'Yes, it helped', Icon: ThumbsUp },
  { value: 'NO', label: 'No', Icon: ThumbsDown },
];

/** The report page for the pull request, when the lesson names one. */
const reportHrefOf = (repo: string | null, pr: number | null) =>
  (repo && pr
    ? `${MAINTAINERS_REPORT_PATH}?pr=${encodeURIComponent(`${repo}#${pr}`)}`
    : MAINTAINERS_REPORT_PATH) as Route;

/**
 * "Did this help you review the pull request?" on a result page, for everyone. With the light GitHub sign-in a click
 * is stored at once, with the person's name and role on the repository. Without it the click is counted (never shown),
 * and the page asks for the sign-in, which comes back with the pick in its address and stores it with no second click
 * (`returned`). The signed-in reactions are listed under the buttons. The result's own person (`own`, or the API's
 * `OWN_PR` answer) sees a line saying so in place of the buttons: their result takes no reaction.
 */
export function ResultReactions({
  slug,
  login,
  repo,
  pr,
  reactions: firstReactions,
  canReact,
  mine: firstMine,
  returned,
  prompt: firstPrompt = null,
  own: firstOwn = false,
  author = false,
}: {
  slug: string;
  /** The result page's login. */
  login: string;
  repo: string | null;
  pr: number | null;
  reactions: readonly LessonResultReaction[];
  /** The visitor has the light GitHub sign-in a reaction is stored with. */
  canReact: boolean;
  /** The visitor's stored reaction. */
  mine: LessonReaction | null;
  /** The pick that came back from the sign-in this browser started (`?react=`), stored once on arrival. */
  returned: LessonReaction | null;
  /** The sign-in prompt, open for this pick (the catalogue's board). */
  prompt?: LessonReaction | null;
  /** The signed-in visitor is the result's own person. */
  own?: boolean;
  /** The result is the lesson author's, whose pull request it is (the own person's line names it). */
  author?: boolean;
}) {
  const [reactions, setReactions] = useState<readonly LessonResultReaction[]>(firstReactions);
  const [mine, setMine] = useState<LessonReaction | null>(firstMine);
  const [prompt, setPrompt] = useState<LessonReaction | null>(firstPrompt);
  const [own, setOwn] = useState(firstOwn);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // The own person's line takes the focus when a click turned the buttons into it, so it is not lost with them.
  const ownLine = useRef<HTMLParagraphElement>(null);
  const focusOwnLine = useRef(false);
  useEffect(() => {
    if (!own || !focusOwnLine.current) return;
    focusOwnLine.current = false;
    ownLine.current?.focus();
  }, [own]);

  /** Sends one pick and shows its answer. */
  const send = async (reaction: LessonReaction, ask: typeof reactToLessonResult) => {
    setError(null);
    let result: Awaited<ReturnType<typeof ask>>;
    try {
      result = await ask(slug, login, reaction);
    } catch {
      setError(reactionErrorMessage('FAILED'));
      return;
    }
    const outcome = reactionOutcomeOf(result, ask === reactOnReturn);
    switch (outcome.kind) {
      case 'stored':
        setMine(reaction);
        setReactions(outcome.reactions);
        setPrompt(null);
        return;
      case 'prompt':
        setPrompt(reaction);
        return;
      case 'own':
        focusOwnLine.current = true;
        setOwn(true);
        setPrompt(null);
        return;
      case 'silent':
        return;
      case 'error':
        setError(outcome.message);
    }
  };

  const store = (reaction: LessonReaction, ask: typeof reactToLessonResult) =>
    startTransition(() => send(reaction, ask));

  // Back from the sign-in: the pick it carried is stored once, and only then does the address drop it, through the
  // browser's history: a router navigation while the store is on its way would cancel it.
  const returnedOnce = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, on the way back.
  useEffect(() => {
    if (!returned || returnedOnce.current) return;
    returnedOnce.current = true;
    startTransition(() =>
      settleReturnedPick(
        { canReact, own },
        {
          store: () => send(returned, reactOnReturn),
          prompt: () => setPrompt(returned),
          clean: () => dropReturnQuery(window),
        },
      ),
    );
  }, []);

  const click = (reaction: LessonReaction) => {
    if (canReact) {
      store(reaction, reactToLessonResult);
      return;
    }
    reportLearnEvent(
      {
        kind: 'learn_click',
        event: 'reaction_clicked',
        source: 'learn_result',
        detail: reaction === 'YES' ? 'yes' : 'no',
      },
      slug,
    );
    setPrompt(reaction);
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4.5" data-result-reactions="">
      <h2 className="text-base font-semibold" id={`react-${slug}`}>
        Did this help you review the pull request?
      </h2>
      {own ? (
        <p ref={ownLine} tabIndex={-1} className="text-sm text-muted-foreground outline-none" data-own-result="">
          {ownResultLineOf(author)}
        </p>
      ) : (
        <fieldset className="m-0 flex flex-wrap gap-2 border-0 p-0" aria-labelledby={`react-${slug}`}>
          {BUTTONS.map(({ value, label, Icon }) => (
            <Button
              key={value}
              type="button"
              variant="outline"
              aria-pressed={mine === value || prompt === value}
              disabled={pending}
              onClick={() => click(value)}
              className={cn(
                'max-sm:min-h-11',
                (mine === value || prompt === value) && 'border-primary bg-brand-soft/40',
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </Button>
          ))}
        </fieldset>
      )}
      {prompt && !own ? (
        <form
          action={signInToReact}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-brand-soft px-4 py-3"
          data-react-sign-in={prompt}
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="login" value={login} />
          <input type="hidden" name="reaction" value={prompt} />
          <span className="text-sm">Sign in with GitHub to send your answer. It appears here with your name.</span>
          <Button type="submit" size="sm" className="h-8 gap-1.5 px-3 font-semibold max-sm:min-h-11">
            <FaGithub aria-hidden="true" className="size-4 shrink-0" />
            Sign in with GitHub
          </Button>
        </form>
      ) : null}
      {mine && !prompt && !own ? (
        <p className="text-sm text-muted-foreground" role="status">
          Thank you: you {reactionWordsOf(mine)}.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {reactions.length ? (
        <ul className="flex flex-col gap-2 border-t pt-3" data-reactions="">
          {reactions.map((reaction) => (
            <li key={reaction.login} className="flex items-center gap-2 text-sm text-muted-foreground">
              <GithubAvatar url={avatarOf(reaction.login)} size={20} className="border" />
              <span>
                <span className="font-medium text-foreground">{reaction.login}</span> ({reactionRoleOf(reaction, repo)}){' '}
                {reactionWordsOf(reaction.reaction)}.
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <Link href={reportHrefOf(repo, pr)} prefetch={false} className="text-sm font-semibold text-link hover:underline">
        Report this pull request
      </Link>
    </section>
  );
}
