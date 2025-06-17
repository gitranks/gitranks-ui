import { Skeleton } from '@/components/ui/skeleton';

import { ProfileCardsGrid } from './components/profile-card';
import {
  AvatarAndNameContainer,
  AvatarContainer,
  DetailsContainer,
  LeftColumnContainer,
  NameContainer,
  PageContainer,
} from './components/profile-page-backbone';

export default function Loading() {
  return (
    <PageContainer>
      <LeftColumnContainer className="gap-8">
        <AvatarAndNameContainer>
          <AvatarContainer>
            <Skeleton className="w-full h-full rounded-full" />
          </AvatarContainer>
          <NameContainer className="flex flex-col gap-2">
            <Skeleton className="h-5 w-[200]" />
            <Skeleton className="h-4 w-[150]" />
          </NameContainer>
        </AvatarAndNameContainer>
        <DetailsContainer>
          <Skeleton className="h-4 flex grow" />
          <Skeleton className="h-4 flex grow" />
        </DetailsContainer>
      </LeftColumnContainer>
      <div className="flex-grow flex flex-col gap-6">
        <ProfileCardsGrid>
          <Skeleton className="h-[150px] rounded-xl" />
          <Skeleton className="h-[150px] rounded-xl" />
        </ProfileCardsGrid>
      </div>
    </PageContainer>
  );
}
