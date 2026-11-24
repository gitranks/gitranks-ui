'use client';

import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { LeftColumnContainer, PageContainer } from './profile-page-backbone';
import { OwnerStrip, SkillsHeading, useSkillsOwner } from './skills-owner';
import { SkillsMissing } from '@/components/skills/skills-missing';
import { SkillsPageView } from '@/components/skills/skills-page-view';
import { SkillsStart } from '@/components/skills/skills-start';
import { otherBoxOf } from '@/lib/skills/skills-owner';
import { ownerLayerOf } from '@/lib/skills/skills-view';
import { avatarPath, userAvatarAlt } from '@/utils/avatar-path';
import { loginFromPath } from '@/utils/login-from-path';

/**
 * A Skills address with no public page: "[login] has no Skills page", the same for everyone, whatever the reason. Its
 * owner's own page takes its place once their view arrives: what fills it while there is nothing on it, or the page only
 * they can see, with its strip. The login comes from the address, as a not-found page gets no params.
 */
export function SkillsMissingScreen() {
  const params = useParams<{ login: string }>();
  const login = loginFromPath(params.login ?? '');
  const { owner, view, pending, toggle } = useSkillsOwner(login);
  const layer = owner && view ? ownerLayerOf(view.mine, false) : { kind: 'none' as const };
  // A login GitHub does not know has no avatar: the column keeps the name alone.
  const [noAvatar, setNoAvatar] = useState(false);

  let content = <SkillsMissing login={login} />;
  if (layer.kind === 'start') {
    content = (
      <>
        <SkillsHeading />
        <div className="flex flex-col gap-8">
          <OwnerStrip login={login} mine={layer.mine} pending={pending} toggle={toggle} />
          <SkillsStart mine={layer.mine} />
        </div>
      </>
    );
  } else if (layer.kind === 'own' && view) {
    content = (
      <>
        <SkillsHeading />
        <SkillsPageView
          page={layer.page}
          now={view.at}
          strip={<OwnerStrip login={login} mine={layer.mine} pending={pending} toggle={toggle} />}
          other={otherBoxOf(layer.mine)}
          learnOpen={layer.mine.learnOpen}
        />
      </>
    );
  }

  return (
    <PageContainer>
      <LeftColumnContainer>
        {login ? (
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
        ) : null}
      </LeftColumnContainer>
      <section className="flex min-w-0 flex-col gap-4">{content}</section>
    </PageContainer>
  );
}
