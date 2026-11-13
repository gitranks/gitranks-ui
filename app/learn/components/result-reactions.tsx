'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { FaGithub } from 'react-icons/fa';

import { reactOnReturn, reactToLessonResult, signInToReact } from '../actions';
import { avatarOf } from './lesson-header';
import { GithubAvatar } from '@/app/components/landing/landing-ui';
import { reportLearnEvent } from '@/components/contribute-click-tracker/contribute-click-tracker';
import { Button } from '@/components/ui/button';
import { MAINTAINERS_REPORT_PATH } from '@/lib/contribute/contribute-path';
import type { LessonReaction, LessonResultReaction } from '@/lib/learn/learn.types';
import { reactionRoleOf, reactionWordsOf } from '@/lib/learn/lesson-public';
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

const FAILED: Record<string, string> = {
  RATE_LIMITED: 'You have sent the most answers we take in a day. Try again tomorrow.',
  NOT_OURS: 'This result is no longer on GitRanks.',
  NOT_AVAILABLE_YET: 'This is not available yet. It is coming soon.',
};

/**
 * "Did this help you review the pull request?" on a result page, for everyone. With the light GitHub sign-in a click
 * is stored at once, with the person's name and role on the repository. Without it the click is counted (never shown),
 * and the page asks for the sign-in, which comes back with the pick in its address and stores it with no second click
 * (`returned`). The signed-in reactions are listed under the buttons.
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
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [reactions, setReactions] = useState<readonly LessonResultReaction[]>(firstReactions);
  const [mine, setMine] = useState<LessonReaction | null>(firstMine);
  const [prompt, setPrompt] = useState<LessonReaction | null>(firstPrompt);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const store = (reaction: LessonReaction, ask: typeof reactToLessonResult) =>
    startTransition(async () => {
      setError(null);
      const result = await ask(slug, login, reaction);
      if (result.ok) {
        setMine(reaction);
        setReactions(result.data);
        setPrompt(null);
        return;
      }
      if (result.error === 'SIGNED_OUT') {
        setPrompt(reaction);
        return;
      }
      // A pick back from a sign-in this browser did not start is not stored: nothing to say about it.
      if (ask === reactOnReturn && result.error === 'INVALID') return;
      setError(FAILED[result.error] ?? 'Something went wrong. Try again in a minute.');
    });

  // Back from the sign-in: the pick it carried is stored once, then the address drops it.
  const returnedOnce = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, on the way back.
  useEffect(() => {
    if (!returned || returnedOnce.current) return;
    returnedOnce.current = true;
    // Stored with the sign-in's token; without one (the sign-in did not keep it), the pick asks for it again.
    if (canReact) store(returned, reactOnReturn);
    else setPrompt(returned);
    router.replace(pathname as Route, { scroll: false });
  }, []);

  const click = (reaction: LessonReaction) => {
    if (canReact) {
      store(reaction, reactToLessonResult);
      return;
    }
    reportLearnEvent(
      { kind: 'learn_click', source: 'reaction_clicked', target: reaction === 'YES' ? 'yes' : 'no' },
      slug,
    );
    setPrompt(reaction);
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4.5" data-result-reactions="">
      <h2 className="text-base font-semibold" id={`react-${slug}`}>
        Did this help you review the pull request?
      </h2>
      <fieldset className="m-0 flex flex-wrap gap-2 border-0 p-0" aria-labelledby={`react-${slug}`}>
        {BUTTONS.map(({ value, label, Icon }) => (
          <Button
            key={value}
            type="button"
            variant="outline"
            aria-pressed={mine === value || prompt === value}
            disabled={pending}
            onClick={() => click(value)}
            className={cn('max-sm:min-h-11', (mine === value || prompt === value) && 'border-primary bg-brand-soft/40')}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </Button>
        ))}
      </fieldset>
      {prompt ? (
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
      {mine && !prompt ? (
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
