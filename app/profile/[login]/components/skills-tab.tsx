'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { Pill } from '@/components/pill/pill';
import { Tab } from '@/components/tabs/tabs';
import { SKILLS_SEEN_MINE_PATH, SKILLS_TAB_MINE_PATH, skillsBriefApiPath, skillsPath } from '@/lib/skills/paths';
import type { SkillsBriefAnswer, SkillsTabAnswer } from '@/lib/skills/skills.types';
import { loginFromPath } from '@/utils/login-from-path';

/** Whether a path is the Skills tab of `login`, in any spelling of the login. */
export const isSkillsTabPath = (pathname: string, login: string) =>
  loginFromPath(pathname).toLowerCase() === skillsPath(loginFromPath(login)).toLowerCase();

/**
 * The profile's Skills tab, after Languages. The layout is cached for everyone, so it is decided here, in the browser:
 * other people see it when the person has a public Skills page (the numbers the profile's block reads too); the
 * signed-in owner always sees it, with "New" until they first open it, which tells the API and this browser.
 */
export function SkillsTab({ login }: { login: string }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const owner = session?.user.githubLogin?.toLowerCase() === loginFromPath(login).toLowerCase();
  const [shown, setShown] = useState(false);
  const [tabNew, setTabNew] = useState(false);
  const here = isSkillsTabPath(pathname, login);

  useEffect(() => {
    let live = true;
    fetch(skillsBriefApiPath(loginFromPath(login)))
      .then((response) => (response.ok ? (response.json() as Promise<SkillsBriefAnswer>) : null))
      .catch(() => null)
      .then((answer) => {
        if (live) setShown(!!answer?.brief);
      });
    return () => {
      live = false;
    };
  }, [login]);

  useEffect(() => {
    if (!owner) return;
    let live = true;
    fetch(SKILLS_TAB_MINE_PATH, { cache: 'no-store' })
      .then((response) => (response.ok ? (response.json() as Promise<SkillsTabAnswer>) : null))
      .catch(() => null)
      .then((answer) => {
        if (live) setTabNew(answer?.tabNew === true);
      });
    return () => {
      live = false;
    };
  }, [owner]);

  // Opening the tab takes its "New" away, here at once and for good.
  useEffect(() => {
    if (!owner || !here || !tabNew) return;
    setTabNew(false);
    void fetch(SKILLS_SEEN_MINE_PATH, { method: 'POST' }).catch(() => undefined);
  }, [owner, here, tabNew]);

  if (!owner && !shown) return null;
  return (
    <Tab href={skillsPath(loginFromPath(login))} data={{ 'data-skills-tab': tabNew ? 'new' : '' }}>
      Skills
      {tabNew ? (
        <>
          {' '}
          <Pill tone="violet" size="small">
            New
          </Pill>
        </>
      ) : null}
    </Tab>
  );
}
