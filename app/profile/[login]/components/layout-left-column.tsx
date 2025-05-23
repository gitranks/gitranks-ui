import { formatDistanceToNow } from 'date-fns';
import { BriefcaseBusiness, ExternalLink, Hourglass, Link2, Mail, MapPin, Timer, UsersRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { FC, ReactNode } from 'react';

import { Page } from '@/components/page/page';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { UserQuery } from '@/types/generated/graphql';

import { ProfileListItem } from './profile-list-item';
import { RefreshButton } from './refresh-button';
import { getSocialIcon } from '../utils/get-social-icon';

type LayoutLeftColumnProps = Readonly<{
  user: UserQuery['user'];
  children: ReactNode;
  className?: string;
}>;

export const LayoutLeftColumn: FC<LayoutLeftColumnProps> = ({ user, children, className }) => {
  const showContact = !!user?.email || !!user?.websiteUrl || !!user?.socialAccounts?.nodes?.length;

  if (!user) {
    return null;
  }

  return (
    <Page className={cn('gap-6 flex-col md:flex-row', className)}>
      <div className="w-full md:w-3xs xl:w-2xs flex flex-col shrink-0 gap-4">
        <div className="flex flex-row md:flex-col items-center md:items-start gap-4">
          <div className="w-[64] sm:w-[128] md:w-full">
            <AspectRatio ratio={1}>
              <Avatar className="w-full h-full rounded-full" asChild>
                <AvatarImage src={user.avatarUrl!} />
              </Avatar>
            </AspectRatio>
          </div>
          <div>
            <h1 className="font-semibold text-2xl">{user.name}</h1>
            <h2 className="text-muted-foreground">@{user.login}</h2>
          </div>
        </div>
        <div className="flex flex-row md:flex-col gap-4">
          <RefreshButton />
          <Button size="sm" variant="secondary" className="flex-grow" asChild>
            <Link href={`https://github.com/${user.login}`} target="_blank" rel="noopener noreferrer">
              Open GitHub
              <ExternalLink className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <ProfileListItem value={user.location} Icon={MapPin} />
            <ProfileListItem value={user.company} Icon={BriefcaseBusiness} />
            <ProfileListItem value={'Profile age: ' + formatDistanceToNow(user.githubCreatedAt)} Icon={Hourglass} />
            <ProfileListItem
              value={'Updated ' + formatDistanceToNow(user.githubFetchedAt, { addSuffix: true })}
              Icon={Timer}
            />
            <ProfileListItem
              value={`${user.followersCount?.toLocaleString('en-US')} followers • ${user.followingCount?.toLocaleString(
                'en-US',
              )} following`}
              Icon={UsersRound}
            />
          </div>
          {showContact && (
            <div className="flex flex-col gap-1.5">
              <h4 className="text-lg font-semibold">Contacts</h4>
              <ProfileListItem value={user.email} url={`mailto:${user.email}`} Icon={Mail} />
              <ProfileListItem value={user.websiteUrl} url={user.websiteUrl!} Icon={Link2} />
              {user.socialAccounts?.nodes?.map((account) => (
                <ProfileListItem
                  key={`${account.provider}${account.displayName}`}
                  value={account.displayName}
                  url={account.url}
                  Icon={getSocialIcon(account.provider, account.url)}
                />
              ))}
            </div>
          )}
          {!!user.organizations?.length && (
            <div className="flex flex-col gap-1.5">
              <h4 className="text-lg font-semibold">Organizations</h4>
              <div className="flex gap-1 flex-wrap">
                {user.organizations?.map((org) => (
                  <TooltipProvider key={org.login}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`https://github.com/${org.login}`} target="_blank" rel="noopener noreferrer">
                          <Image
                            src={org.avatarUrl!}
                            alt={org.login}
                            width={32}
                            height={32}
                            className="rounded-sm bg-secondary"
                          />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>{org.login}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {children}
    </Page>
  );
};
