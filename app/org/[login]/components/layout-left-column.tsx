import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, Hourglass, Link2, Mail, MapPin, Timer } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { FC, ReactNode } from 'react';
import { MdOutlineVerified } from 'react-icons/md';
import { PiUsersThree } from 'react-icons/pi';

import { ProfileListItem } from '@/app/profile/[login]/components/profile-list-item';
import {
  ActionsContainer,
  AvatarAndNameContainer,
  AvatarContainer,
  DetailsContainer,
  LeftColumnContainer,
  NameContainer,
  PageContainer,
} from '@/app/profile/[login]/components/profile-page-backbone';
import { Button } from '@/components/ui/button';
import type { PageOrgQuery } from '@/types/generated/graphql';
import { ensureLinkProtocol } from '@/utils/ensure-link-protocol';

type LayoutLeftColumnProps = Readonly<{
  org: PageOrgQuery['organization'];
  children: ReactNode;
}>;

const AVATAR_SIZE = 288;

export const LayoutLeftColumn: FC<LayoutLeftColumnProps> = ({ org, children }) => {
  const showContact = !!org?.email || !!org?.websiteUrl;

  if (!org) {
    return null;
  }

  return (
    <PageContainer>
      <LeftColumnContainer>
        <AvatarAndNameContainer>
          <AvatarContainer>
            <Image
              src={`${org.avatarUrl}`}
              alt={`${org.login} avatar`}
              className="rounded-full w-full h-full"
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
              loading="eager"
              fetchPriority="high"
            />
          </AvatarContainer>
          <NameContainer>
            <h1 className="font-semibold text-2xl flex items-center gap-1" translate="no">
              {org.name} {org.isVerified && <MdOutlineVerified className="size-5 fill-positive" />}
            </h1>
            <h2 className="text-muted-foreground" translate="no">
              @{org.login}
            </h2>
          </NameContainer>
        </AvatarAndNameContainer>
        <ActionsContainer>
          <Button size="sm" variant="secondary" className="grow" asChild>
            <Link href={`https://github.com/${org.login}`} target="_blank" rel="noopener noreferrer">
              Open GitHub
              <ExternalLink className="size-4" />
            </Link>
          </Button>
        </ActionsContainer>
        <DetailsContainer>
          <div className="flex flex-col gap-1.5">
            {!!org.location && (
              <ProfileListItem value={`${org.countryFlag ? `${org.countryFlag} ` : ''}${org.location}`} Icon={MapPin} />
            )}
            <ProfileListItem value={`Profile age: ${formatDistanceToNow(org.githubCreatedAt)}`} Icon={Hourglass} />
            <ProfileListItem
              value={`Updated ${formatDistanceToNow(org.updatedAt, { addSuffix: true })}`}
              Icon={Timer}
            />
            <ProfileListItem value={`Members: ${org.usersCount?.toLocaleString('en-US')}`} Icon={PiUsersThree} />
          </div>
          {showContact && (
            <div className="flex flex-col gap-1.5">
              <h4 className="text-lg font-semibold">Contacts</h4>
              <ProfileListItem value={org.email} url={`mailto:${org.email}`} Icon={Mail} />
              <ProfileListItem value={org.websiteUrl} url={ensureLinkProtocol(org.websiteUrl)} Icon={Link2} />
            </div>
          )}
        </DetailsContainer>
      </LeftColumnContainer>
      <section className="flex flex-col gap-4 w-full">{children}</section>
    </PageContainer>
  );
};
