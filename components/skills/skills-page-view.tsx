import type { ReactNode } from 'react';

import { SkillsBuiltSection } from './skills-built';
import { SkillsCoursesSection } from './skills-courses';
import { SkillsFixesSection } from './skills-fixes';
import { SkillsNumbersBox } from './skills-numbers-box';
import { SkillsProductBox } from './skills-start';
import type { SkillsPage } from '@/lib/skills/skills.types';
import type { ProductBox } from '@/lib/skills/skills-owner';

/**
 * A Skills page's content, top to bottom: the owner's strip when there is one, the numbers box with its line, "Fixes in
 * real projects", "Built", "Courses", and last the box about the other product that only the owner sees, so it moves
 * nothing.
 */
export function SkillsPageView({
  page,
  now,
  strip = null,
  other = null,
  onMore,
  loadingMore = false,
  leftLine = null,
  builtOnlyYou = false,
}: {
  page: SkillsPage;
  /** The time the page is drawn at, for its dates. */
  now: Date;
  /** The owner's strip, in its row above the content. */
  strip?: ReactNode;
  /** The owner's box about the product they do not use. */
  other?: ProductBox | null;
  onMore?: () => void;
  /** "Show 20 more" is on its way: the button waits. */
  loadingMore?: boolean;
  /** The line under the fixes where the next ones cannot be read. */
  leftLine?: string | null;
  /** The Built rows are the owner's own, which only they see: the section says so. */
  builtOnlyYou?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-8" data-skills-page={page.numbers.kind}>
      {strip}
      <SkillsNumbersBox numbers={page.numbers} />
      <SkillsFixesSection
        fixes={page.fixes}
        made={page.numbers.made}
        login={page.login}
        now={now}
        onMore={onMore}
        loading={loadingMore}
        leftLine={leftLine}
      />
      <SkillsBuiltSection built={page.built} login={page.login} now={now} onlyYou={builtOnlyYou} />
      <SkillsCoursesSection courses={page.courses} now={now} />
      {other ? <SkillsProductBox box={other} /> : null}
    </div>
  );
}
