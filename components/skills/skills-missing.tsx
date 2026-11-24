import Link from 'next/link';

import { skillsProfilePath } from '@/lib/skills/paths';

/**
 * The end of a Skills address with no public page: the same for a person with nothing to show, a hidden page and a
 * deleted person, so hiding a page gives nothing away. The page answers "not found" with it.
 */
export function SkillsMissing({ login }: { login: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-6" data-skills-missing="">
      <h2 className="m-0 text-xl font-semibold tracking-tight [overflow-wrap:anywhere]">{login} has no Skills page</h2>
      <Link
        href={skillsProfilePath(login)}
        prefetch={false}
        className="text-sm font-medium text-link hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
      >
        Open {login}’s profile
      </Link>
    </div>
  );
}
