import Link from 'next/link';

import { Button } from '@/components/ui/button';
import type { FixLearnBlockWords } from '@/lib/learn/fix-page';

/**
 * A Learn fix's part of "How it was made", above the list: what the fixer answered before sending it, where to read
 * the questions and the answers, "Answer them yourself", and the lesson behind the fix. The same for everyone.
 */
export function FixLearnBlock({ words }: { words: FixLearnBlockWords }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-brand-soft/40 p-5" data-fix-learn-block="">
      {words.title ? <h2 className="m-0 text-base font-semibold text-pretty">{words.title}</h2> : null}
      {words.text ? <p className="m-0 text-sm text-muted-foreground">{words.text}</p> : null}
      {words.answers || words.yourself ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {words.answers ? (
            <Link
              href={words.answers.href}
              prefetch={false}
              className="text-sm font-medium text-link hover:underline"
              data-fix-learn-answers=""
            >
              {words.answers.text}
            </Link>
          ) : null}
          {words.yourself ? (
            <Button asChild variant="outline" size="sm" className="max-sm:min-h-11">
              <Link href={words.yourself.href} prefetch={false} data-fix-learn-yourself="">
                {words.yourself.text}
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}
      {words.lesson ? (
        <p className="m-0 flex min-w-0 items-baseline gap-1.5 text-sm">
          <span className="shrink-0 text-muted-foreground">The lesson behind it:</span>
          <Link
            href={words.lesson.href}
            prefetch={false}
            title={words.lesson.title}
            className="max-w-[28rem] truncate font-medium text-link hover:underline"
            data-fix-learn-lesson=""
          >
            {words.lesson.title}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
