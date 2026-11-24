import { EyeOff } from 'lucide-react';
import Link from 'next/link';

import { SkillsNumbersBox } from './skills-numbers-box';
import { MoreLink, ProfileSection } from '@/app/profile/[login]/components/profile-card';
import { skillsPath } from '@/lib/skills/paths';
import type { SkillsNumbers, SkillsState } from '@/lib/skills/skills.types';
import { shownFigures } from '@/lib/skills/skills-figures';
import { blockLinkOf, blockOwnerLineOf } from '@/lib/skills/skills-owner';

/**
 * The Skills block on the profile's overview: the tab's numbers box with three numbers at most, under the heading
 * "Skills" with one link to the tab that names what is listed there. The owner of a page only they see gets one line
 * that says so. Nothing to show: no block.
 */
export function SkillsBlock({
  login,
  numbers,
  ownState = null,
}: {
  login: string;
  numbers: SkillsNumbers | null;
  /** The page's state, for its owner alone; null for everyone else. */
  ownState?: SkillsState | null;
}) {
  if (!numbers || !shownFigures(numbers.blockFigures).length) return null;
  const owner = ownState ? blockOwnerLineOf(ownState) : null;
  return (
    <ProfileSection
      id="profile-skills"
      title="Skills"
      action={<MoreLink href={skillsPath(login)}>{blockLinkOf(numbers)}</MoreLink>}
    >
      {owner ? (
        <div
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-dashed px-4 py-2.5 text-sm text-muted-foreground"
          data-skills-block-owner=""
        >
          <span className="flex items-center gap-2">
            <EyeOff aria-hidden="true" className="size-4 shrink-0" />
            {owner.text}
          </span>
          {owner.link ? (
            <Link href={skillsPath(login)} prefetch={false} className="font-medium text-link hover:underline">
              {owner.link}
            </Link>
          ) : null}
        </div>
      ) : null}
      <SkillsNumbersBox numbers={numbers} figures={numbers.blockFigures} />
    </ProfileSection>
  );
}
