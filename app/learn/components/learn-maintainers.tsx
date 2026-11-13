import { GitPullRequest, GraduationCap, type LucideIcon, Terminal } from 'lucide-react';
import Link from 'next/link';

import { CodeBlock } from '@/app/contribute/components/code-block';
import { buttonVariants } from '@/components/ui/button';
import { MAINTAINERS_PATH, MAINTAINERS_REPORT_PATH } from '@/lib/contribute/contribute-path';
import { cn } from '@/lib/utils';

const MEANS: { Icon: LucideIcon; title: string; text: string }[] = [
  {
    Icon: Terminal,
    title: 'An agent wrote the code',
    text: "The author's own coding agent. The footer names it.",
  },
  {
    Icon: GraduationCap,
    title: 'The author studied the change',
    text: 'A lesson on what was wrong, why the fix works and how it connects, with a question on each part. We wrote none of it into the pull request.',
  },
  {
    Icon: GitPullRequest,
    title: 'The author answers your review',
    text: 'Review comments go back to them. They can explain the change, because they had to before submitting.',
  },
];

/** The repository's own file, with the Learn key and the opt-out beside it. */
export const LEARN_CONFIG_EXAMPLE = `learn: welcome   # take Learn pull requests on beginner issues too
# contribute: off  # or: no GitRanks pull requests at all`;

const CARD = 'flex flex-col gap-3 rounded-xl border bg-card p-5';

/**
 * What a pull request made with GitRanks Learn is, for the maintainer who got one: who wrote it, what the author did,
 * that the repository's rules apply, the `learn: welcome` key, and the ways to set rules or report it. Open to every
 * visitor: the footer of every Learn pull request links here.
 */
export function LearnMaintainers() {
  return (
    <main className="flex flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-10 pb-16">
        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide text-brand-soft-foreground uppercase">
              New
            </span>
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              GitRanks Learn · for maintainers
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">
            You got a pull request made with GitRanks Learn
          </h1>
          <p className="text-lg text-foreground/80">
            An AI agent wrote the fix. The person who opened it took a lesson on the change and passed a check before
            they could submit it.
          </p>
        </header>

        <section aria-labelledby="learn-means" className={CARD}>
          <h2 id="learn-means" className="text-lg font-semibold">
            What that means
          </h2>
          <ul className="flex flex-col gap-4">
            {MEANS.map(({ Icon, title, text }) => (
              <li key={title} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-foreground">
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="learn-rules" className={CARD}>
          <h2 id="learn-rules" className="text-lg font-semibold">
            Your rules apply
          </h2>
          <p className="text-sm text-muted-foreground">
            Learn follows the same repository rules as GitRanks Contribute: your AI policy, your contribution guide,
            your labels. A project that keeps beginner issues for people gets no Learn pull requests on them, unless you
            say so:
          </p>
          <CodeBlock label=".github/gitranks.yml" copyLabel="Copy the file" file>
            {LEARN_CONFIG_EXAMPLE}
          </CodeBlock>
          <div className="flex flex-wrap gap-3">
            <Link
              href={MAINTAINERS_PATH}
              prefetch={false}
              className={cn(buttonVariants(), 'min-h-11 px-5 font-semibold max-sm:w-full')}
            >
              Set rules for my repository
            </Link>
            <Link
              href={MAINTAINERS_REPORT_PATH}
              prefetch={false}
              className={cn(buttonVariants({ variant: 'outline' }), 'min-h-11 px-5 font-semibold max-sm:w-full')}
            >
              Report this pull request
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
