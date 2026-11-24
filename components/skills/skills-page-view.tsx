import type { ReactNode } from 'react';

import { SkillsCoursesSection } from './skills-courses';
import { SkillsFixesSection } from './skills-fixes';
import { SkillsNumbersBox } from './skills-numbers-box';
import { SkillsProductBox } from './skills-start';
import type { SkillsPage } from '@/lib/skills/skills.types';
import type { ProductBox } from '@/lib/skills/skills-owner';

/**
 * A Skills page's content, top to bottom: the owner's strip when there is one, the numbers box with its line, "Fixes in
 * real projects", "Courses", and last the box about the other product that only the owner sees, so it moves nothing.
 * While Learn is not open to the reader, the content shows nothing of Learn: no courses, and its fixes as plain ones.
 * The owner's box comes already decided by whether Learn is open to them.
 */
export function SkillsPageView({
  page,
  now,
  strip = null,
  other = null,
  learnOpen = true,
  onMore,
  loadingMore = false,
  leftLine = null,
}: {
  page: SkillsPage;
  /** The time the page is drawn at, for its dates. */
  now: Date;
  /** The owner's strip, in its row above the content. */
  strip?: ReactNode;
  /** The owner's box about the product they do not use, left out already where Learn is not open to them. */
  other?: ProductBox | null;
  /** Whether Learn is open to the page's readers. */
  learnOpen?: boolean;
  onMore?: () => void;
  /** "Show 20 more" is on its way: the button waits. */
  loadingMore?: boolean;
  /** The line under the fixes where the next ones cannot be read. */
  leftLine?: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-8" data-skills-page={page.numbers.kind}>
      {strip}
      <SkillsNumbersBox numbers={page.numbers} learnOpen={learnOpen} />
      <SkillsFixesSection
        fixes={page.fixes}
        made={page.numbers.made}
        login={page.login}
        learnOpen={learnOpen}
        now={now}
        onMore={onMore}
        loading={loadingMore}
        leftLine={leftLine}
      />
      {learnOpen ? <SkillsCoursesSection courses={page.courses} now={now} /> : null}
      {other ? <SkillsProductBox box={other} /> : null}
    </div>
  );
}
