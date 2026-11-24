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
 */
export function SkillsPageView({
  page,
  strip = null,
  other = null,
  learnOpen = true,
  onMore,
}: {
  page: SkillsPage;
  /** The owner's strip, in its row above the content. */
  strip?: ReactNode;
  /** The owner's box about the product they do not use. */
  other?: ProductBox | null;
  learnOpen?: boolean;
  onMore?: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-8" data-skills-page={page.numbers.kind}>
      {strip}
      <SkillsNumbersBox numbers={page.numbers} made={page.made} />
      <SkillsFixesSection
        fixes={page.fixes}
        made={page.made}
        login={page.login}
        learnOpen={learnOpen}
        onMore={onMore}
      />
      <SkillsCoursesSection courses={page.courses} />
      {other ? <SkillsProductBox box={other} /> : null}
    </div>
  );
}
