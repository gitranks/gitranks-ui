import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { RefChips } from '@/components/workspace/ref-chips';
import { learnLessonPath } from '@/lib/learn/paths';
import type { SkillsFix } from '@/lib/skills/skills.types';
import { fixLessonOf, fixLinksOf, fixStateWordsOf, MADE_WORDS } from '@/lib/skills/skills-fixes';
import { cn } from '@/lib/utils';

/**
 * One fix in a real project: the repository with its issue and pull request on GitHub, the language, which product
 * made it when the person used both, the title, the lesson it used, where it stands, and "How it was made". A fix
 * whose page was hidden keeps its row with its GitHub links alone.
 */
export function SkillsFixRow({
  fix,
  namesProduct = false,
  learnOpen = true,
}: {
  fix: SkillsFix;
  /** Both products made fixes: the row says which made this one. */
  namesProduct?: boolean;
  /** Whether Learn's pages are open to the reader: a Learn fix's view and its lesson show only then. */
  learnOpen?: boolean;
}) {
  const links = fixLinksOf(fix, { learnOpen });
  const lesson = learnOpen && fix.page ? fixLessonOf(fix) : null;
  const merged = fix.state === 'MERGED';
  return (
    <article
      className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5"
      data-skills-fix={`${fix.repo}#${fix.number}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <RefChips repo={fix.repo} issue={fix.issueNumber} pr={{ number: fix.number, url: fix.url }} />
          {fix.language ? <span>{fix.language}</span> : null}
          {namesProduct ? <span data-made={fix.made}>{MADE_WORDS[fix.made]}</span> : null}
        </span>
        {links.title ? (
          <Link
            href={links.title}
            prefetch={false}
            className="font-semibold text-pretty text-foreground hover:underline"
          >
            {fix.title}
          </Link>
        ) : (
          <span className="font-semibold text-pretty text-foreground">{fix.title}</span>
        )}
        {lesson ? (
          <span className="text-sm text-muted-foreground">
            {lesson.verb}{' '}
            <Link href={learnLessonPath(lesson.lesson.slug)} prefetch={false} className="text-link hover:underline">
              {lesson.lesson.title}
            </Link>
            .
          </span>
        ) : null}
      </div>
      <div className="flex flex-none flex-wrap items-center gap-3">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
            merged ? 'bg-positive/10 text-positive' : 'bg-brand-soft text-brand-soft-foreground',
          )}
        >
          {fixStateWordsOf(fix)}
        </span>
        {links.made ? (
          <Button asChild variant="outline" className="max-sm:min-h-11">
            <Link href={links.made} prefetch={false}>
              How it was made
            </Link>
          </Button>
        ) : null}
      </div>
    </article>
  );
}
