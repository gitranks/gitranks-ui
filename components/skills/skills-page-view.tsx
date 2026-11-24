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
 * While Learn is not open to the reader, nothing of Learn shows: no courses, no Learn box, and its fixes as plain ones.
 */
export function SkillsPageView({
  page,
  now,
  strip = null,
  other = null,
  learnOpen = true,
  onMore,
}: {
  page: SkillsPage;
  /** The time the page is drawn at, for its dates. */
  now: Date;
  /** The owner's strip, in its row above the content. */
  strip?: ReactNode;
  /** The owner's box about the product they do not use. */
  other?: ProductBox | null;
  learnOpen?: boolean;
  onMore?: () => void;
}) {
  const shownOther = other && (learnOpen || other.product !== 'LEARN') ? other : null;
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
      />
      {learnOpen ? <SkillsCoursesSection courses={page.courses} now={now} /> : null}
      {shownOther ? <SkillsProductBox box={shownOther} /> : null}
    </div>
  );
}
