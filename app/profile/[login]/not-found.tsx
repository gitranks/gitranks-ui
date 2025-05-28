import { FC } from 'react';

import RandomMonsterAvatar from '@/components/monster-avatar/monster-avatar';
import { UserFetchingStatus } from '@/types/generated/graphql';

import { FetchUserButtonForNotFoundPage } from './components/fetch-user-button';
import { ProfileLoginFromUrl } from './components/profile-login-from-url';
import {
  AvatarAndNameContainer,
  AvatarContainer,
  LeftColumnContainer,
  NameContainer,
  PageContainer,
} from './components/profile-page-backbone';

type NotFoundProps = {
  fetchingStatus?: UserFetchingStatus | null;
  fetchingUpdatedAt?: number | null;
};

export const NotFound: FC<NotFoundProps> = ({ fetchingStatus, fetchingUpdatedAt }) => {
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
      <div className="flex-grow flex flex-col gap-6 items-center justify-center text-center">
        <h1 className="text-2xl md:text-4xl font-semibold">404: User Not Found (Yet)</h1>
        <p>
          We couldn’t find that user in our catalog. Push the button below and we’ll run a fresh{' '}
          <code className="bg-muted p-1 rounded-sm">git fetch</code> for you.
        </p>
        <FetchUserButtonForNotFoundPage fetchingStatus={fetchingStatus} fetchingUpdatedAt={fetchingUpdatedAt} />
        {/* <div className="flex items-center w-full">
          <div className="flex grow">
            <Separator />
          </div>
          <span className="flex px-2 text-muted-foreground">or search for another profile</span>
          <div className="flex grow">
            <Separator />
          </div>
        </div> */}
      </div>
    </PageContainer>
  );
};

export default NotFound;
