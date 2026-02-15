import type { FC } from 'react';

import { ProfileLoginFromUrl } from '@/app/profile/[login]/components/profile-login-from-url';
import {
  AvatarAndNameContainer,
  AvatarContainer,
  LeftColumnContainer,
  NameContainer,
  PageContainer,
} from '@/app/profile/[login]/components/profile-page-backbone';
import RandomMonsterAvatar from '@/components/monster-avatar/monster-avatar';

export const NotFound: FC = () => {
  return (
    <PageContainer>
      <LeftColumnContainer className="gap-8">
        <AvatarAndNameContainer>
          <AvatarContainer className="overflow-hidden rounded-full bg-muted">
            <RandomMonsterAvatar className="w-[80%] h-[80%] top-[10%] left-[10%] absolute animate-avatar-entry" />
          </AvatarContainer>
          <NameContainer className="flex flex-col gap-2">
            <h1 className="font-semibold text-2xl">
              <ProfileLoginFromUrl />
            </h1>
            <h2 className="text-muted-foreground">
              @<ProfileLoginFromUrl />
            </h2>
          </NameContainer>
        </AvatarAndNameContainer>
      </LeftColumnContainer>
      <div className="grow flex flex-col gap-6 items-center justify-center text-center">
        <p className="text-2xl md:text-4xl font-semibold">404: Organization Not Found (Yet)</p>
      </div>
    </PageContainer>
  );
};

export default NotFound;
