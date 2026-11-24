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
  id = 'profile-skills',
}: {
  login: string;
  numbers: SkillsNumbers | null;
  /** The page's state, for its owner alone; null for everyone else. */
  ownState?: SkillsState | null;
  /** The section's id, which the profile's links point at; a board that draws the block twice gives each its own. */
  id?: string;
}) {
  if (!numbers || !shownFigures(numbers.blockFigures).length) return null;
  const owner = ownState ? blockOwnerLineOf(ownState) : null;
  const link = blockLinkOf(numbers);
  return (
    <ProfileSection
      id={id}
      title="Skills"
      action={link ? <MoreLink href={skillsPath(login)}>{link}</MoreLink> : undefined}
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
      <SkillsNumbersBox numbers={numbers} place="block" />
    </ProfileSection>
  );
}
