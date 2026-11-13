import Link from 'next/link';
import type { ReactNode } from 'react';

import { GithubAvatar } from '@/app/components/landing/landing-ui';
import type { LessonHead } from '@/lib/learn/learn.types';
import { subjectLineOf } from '@/lib/learn/lesson-format';
import { agentNameOf, pullRequestOf } from '@/lib/learn/lesson-public';

/** A GitHub account's avatar, from GitHub by its login. */
export const avatarOf = (login: string) => `https://avatars.githubusercontent.com/${encodeURIComponent(login)}`;

/** The small label above a shared lesson's title: "Lesson", "Passed". */
export function LessonEyebrow({ tag, text }: { tag: string; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide text-brand-soft-foreground uppercase">
        {tag}
      </span>
      <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{text}</span>
    </div>
  );
}

/**
 * Who created the lesson and with which agent, the issue and the pull request, the language, and `children` (how many
 * passed it, or when a result passed).
 */
export function LessonMeta({ head, children }: { head: LessonHead; children?: ReactNode }) {
  const subject = subjectLineOf(head);
  const pr = pullRequestOf(head);
  const author = head.author.login;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
      <span className="flex items-center gap-2">
        {author ? <GithubAvatar url={avatarOf(author)} size={24} className="border" /> : null}
        <span>
          Created by{' '}
          {author ? (
            <>
              <Link
                href={`/profile/${encodeURIComponent(author)}`}
                prefetch={false}
                className="font-medium text-foreground hover:underline"
              >
                {author}
              </Link>{' '}
              with{' '}
            </>
          ) : null}
          {agentNameOf(head)}
        </span>
      </span>
      {subject ? (
        <a href={subject.href} target="_blank" rel="noreferrer" className="font-mono hover:underline">
          {subject.text} ↗<span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : null}
      {pr?.url ? (
        <a href={pr.url} target="_blank" rel="noreferrer" className="font-mono hover:underline">
          pull request #{pr.number} ↗<span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : null}
      {head.language ? <span>{head.language}</span> : null}
      {children}
    </div>
  );
}
