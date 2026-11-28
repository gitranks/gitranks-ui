'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

import { LeftColumnContainer, PageContainer } from './profile-page-backbone';
import { OwnerStrip, SkillsHeading, StripRow, useSkillsOwner } from './skills-owner';
import { useBuildViewer } from '@/components/build/build-viewer';
import { SkillsMissing } from '@/components/skills/skills-missing';
import { SkillsPageView } from '@/components/skills/skills-page-view';
import { SkillsStart } from '@/components/skills/skills-start';
import { skillsTitleOf } from '@/lib/skills/seo';
import { fixesLeftLineOf } from '@/lib/skills/skills-fixes';
import { otherBoxOf } from '@/lib/skills/skills-owner';
import { ownerLayerOf } from '@/lib/skills/skills-view';
import { avatarPath, userAvatarAlt } from '@/utils/avatar-path';
import { loginFromPath } from '@/utils/login-from-path';

/**
 * A Skills address with no public page: "[login] has no Skills page", the same for everyone, whatever the reason. Its
 * owner's own page takes its place once their view arrives: what fills it while there is nothing on it, or the page only
 * they can see, with its strip, under the page's own title; until it arrives, the heading and the strip's row. That
 * page's next fixes cannot be read (they are read as everyone reads them), so a line says how many more there are. The
 * login comes from the address, as a not-found page gets no params; the profile's left column is the Skills layout's.
 */
export function SkillsMissingScreen() {
  const params = useParams<{ login: string }>();
  const login = loginFromPath(params.login ?? '');
  const { owner, view, pending, toggle, sessionLoading } = useSkillsOwner(login);
  const layer = owner && view ? ownerLayerOf(view.mine, false) : { kind: 'none' as const };
  // Build's box is on the page only while Build is open to the owner, as the header's Grow menu.
  const { open: build } = useBuildViewer();

  // The page's title is the same for everyone ("No Skills page"); its owner reads their own page under its own name.
  useEffect(() => {
    if (layer.kind !== 'none') document.title = skillsTitleOf(login);
  }, [layer.kind, login]);

  if (layer.kind === 'start') {
    return (
      <>
        <SkillsHeading />
        <div className="flex flex-col gap-8">
          <OwnerStrip login={login} mine={layer.mine} pending={pending} toggle={toggle} />
          <SkillsStart mine={layer.mine} build={build} />
        </div>
      </>
    );
  }
  if (layer.kind === 'own' && view) {
    return (
      <>
        <SkillsHeading />
        <SkillsPageView
          page={layer.page}
          now={view.at}
          strip={<OwnerStrip login={login} mine={layer.mine} pending={pending} toggle={toggle} />}
          other={otherBoxOf(layer.mine)}
          leftLine={fixesLeftLineOf(
            Math.max(layer.page.numbers.fixes, layer.page.fixes.total),
            layer.page.fixes.rows.length,
          )}
        />
      </>
    );
  }
  // Its owner never reads "no Skills page" while their view is on its way: the heading and the strip's row hold its place.
  if (owner && !view) {
    return (
      <>
        <SkillsHeading />
        <StripRow />
      </>
    );
  }
  // Until the session says who is reading, the line is in the page, keeping its room, but not seen: its owner never reads it.
  if (sessionLoading) {
    return (
      <div className="invisible">
        <SkillsMissing login={login} />
      </div>
    );
  }
  return <SkillsMissing login={login} />;
}

/**
 * The left column of a Skills address whose login has no profile here: its GitHub avatar and the login alone, around
 * the tab's content. A login GitHub does not know has no avatar: the column keeps the name alone.
 */
export function SkillsLoginColumn({ login, children }: { login: string; children: ReactNode }) {
  const [noAvatar, setNoAvatar] = useState(false);

  return (
    <PageContainer>
      <LeftColumnContainer>
        <div className="flex flex-row items-center gap-4 md:flex-col md:items-start">
          {noAvatar ? null : (
            <Image
              src={avatarPath(login)}
              alt={userAvatarAlt(login)}
              width={288}
              height={288}
              unoptimized
              onError={() => setNoAvatar(true)}
              className="size-16 rounded-full bg-muted ring-1 ring-border sm:size-32 md:size-auto md:w-full"
            />
          )}
          <p className="m-0 text-2xl font-semibold tracking-tight" translate="no">
            {login}
          </p>
        </div>
      </LeftColumnContainer>
      <section className="flex min-w-0 flex-col gap-4">{children}</section>
    </PageContainer>
  );
}
