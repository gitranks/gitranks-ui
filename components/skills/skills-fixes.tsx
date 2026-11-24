'use client';

import { SkillsFixRow } from './skills-fix-row';
import { SkillsLine } from './skills-line';
import { Button } from '@/components/ui/button';
import type { SkillsFixes } from '@/lib/skills/skills.types';
import { fixesLineOf, moreFixesOf, namesProduct } from '@/lib/skills/skills-fixes';
import type { LearnFixMade } from '@/lib/workspace/pull-request-page.types';

/**
 * "Fixes in real projects": the heading, the line that names the products that made them, the rows (merged first, then
 * open, in the API's order), and "Show 20 more", which adds rows in place. Nothing without a fix.
 */
export function SkillsFixesSection({
  fixes,
  made,
  login,
  learnOpen = true,
  onMore,
  loading = false,
}: {
  fixes: SkillsFixes;
  made: readonly LearnFixMade[];
  login: string;
  learnOpen?: boolean;
  /** Asks for the next fixes; the button shows only with it. */
  onMore?: () => void;
  loading?: boolean;
}) {
  if (!fixes.rows.length) return null;
  const more = moreFixesOf(fixes);
  const both = namesProduct(made);
  return (
    <section aria-labelledby="skills-fixes" className="flex flex-col gap-3" data-skills-fixes="">
      <div className="flex flex-col gap-1">
        <h3 id="skills-fixes" className="m-0 text-xl font-bold tracking-tight">
          Fixes in real projects
        </h3>
        <p className="m-0 text-sm text-muted-foreground">
          <SkillsLine parts={fixesLineOf(made, login)} />
        </p>
      </div>
      <ul className="m-0 list-none divide-y overflow-hidden rounded-xl border bg-card p-0">
        {fixes.rows.map((fix) => (
          <li key={`${fix.repo}#${fix.number}`}>
            <SkillsFixRow fix={fix} namesProduct={both} learnOpen={learnOpen} />
          </li>
        ))}
      </ul>
      {more && onMore ? (
        <Button variant="outline" className="self-start max-sm:min-h-11" onClick={onMore} disabled={loading}>
          {more}
        </Button>
      ) : null}
    </section>
  );
}
