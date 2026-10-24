import { formatDistanceToNow } from 'date-fns';
import { BriefcaseBusiness, ExternalLink, Hourglass, Link2, Mail, Timer, UsersRound } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { FC, ReactNode } from 'react';
import { FaGithub } from 'react-icons/fa';

import { getSocialIcon } from '../utils/get-social-icon';
import { FetchUserButtonForProfilePage } from './fetch-user-button';
import { Eyebrow } from './profile-card';
import { ProfileListItem } from './profile-list-item';
import { ProfileLocation } from './profile-location';
import {
  ActionsContainer,
  AvatarAndNameContainer,
  AvatarContainer,
  DetailsContainer,
  LeftColumnContainer,
  NameContainer,
  PageContainer,
} from './profile-page-backbone';
import { LinkPendingStatus } from '@/components/navigation-progress/navigation-progress';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PageProfileOverviewQuery } from '@/types/generated/graphql';
import { ensureLinkProtocol } from '@/utils/ensure-link-protocol';

type LayoutLeftColumnProps = Readonly<{
  user: PageProfileOverviewQuery['user'];
  children: ReactNode;
  className?: string;
}>;

const AVATAR_SIZE = 288;

export const LayoutLeftColumn: FC<LayoutLeftColumnProps> = ({ user, children, className }) => {
  const showContact = !!user?.email || !!user?.websiteUrl || !!user?.socialAccounts?.nodes?.length;

  if (!user) {
    return null;
  }

  return (
    // On phones the contacts and organizations follow the main column, so the ranks come first.
    <PageContainer className="md:grid-rows-[auto_1fr]">
      <LeftColumnContainer className="md:col-start-1 md:row-start-1">
        <AvatarAndNameContainer>
          <AvatarContainer>
            <Image
              src={`${user.avatarUrl}`}
              alt={`${user.login} avatar`}
              className="rounded-full w-full h-full bg-muted ring-1 ring-border"
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
              loading="eager"
              fetchPriority="high"
            />
          </AvatarContainer>
          <NameContainer>
            <h1 className="text-2xl font-semibold tracking-tight text-balance" translate="no">
              {user.name || user.login}
            </h1>
            <p className="text-muted-foreground" translate="no">
              @{user.login}
            </p>
          </NameContainer>
        </AvatarAndNameContainer>
        <ActionsContainer>
          <FetchUserButtonForProfilePage
            fetchingStatus={user.fetchingStatus}
            fetchingUpdatedAt={user.fetchingUpdatedAt}
          />
          <Button size="sm" variant="outline" className="flex-grow" asChild>
            <Link href={`https://github.com/${user.login}`} target="_blank" rel="noopener noreferrer">
              <FaGithub aria-hidden />
              Open GitHub
              <ExternalLink className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          </Button>
        </ActionsContainer>
        <DetailsContainer>
          <div className="flex flex-col gap-1.5">
            {!!user.location && (
              <ProfileLocation location={user.location} country={user.country} countryFlag={user.countryFlag} />
            )}
            <ProfileListItem value={user.company} Icon={BriefcaseBusiness} />
            <ProfileListItem value={`Profile age: ${formatDistanceToNow(user.githubCreatedAt)}`} Icon={Hourglass} />
            <ProfileListItem
              value={`Updated ${formatDistanceToNow(user.githubFetchedAt, { addSuffix: true })}`}
              Icon={Timer}
            />
            <ProfileListItem
              value={
                <>
                  <span className="font-mono tabular-nums">{(user.f ?? 0).toLocaleString('en-US')}</span> followers ·{' '}
                  <span className="font-mono tabular-nums">{(user.followingCount ?? 0).toLocaleString('en-US')}</span>{' '}
                  following
                </>
              }
              Icon={UsersRound}
            />
          </div>
        </DetailsContainer>
      </LeftColumnContainer>
      <section className={cn('flex flex-col gap-4 min-w-0 md:col-start-2 md:row-start-1 md:row-span-2', className)}>
        {children}
      </section>
      {(showContact || !!user.organizations?.length) && (
        <DetailsContainer className="md:col-start-1 md:row-start-2">
          {showContact && (
            <div className="flex flex-col gap-1.5">
              <Eyebrow as="h2" className="mb-1">
                Contacts
              </Eyebrow>
              <ProfileListItem value={user.email} url={`mailto:${user.email}`} Icon={Mail} />
              <ProfileListItem value={user.websiteUrl} url={ensureLinkProtocol(user.websiteUrl)} Icon={Link2} />
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
              <Eyebrow as="h2" className="mb-1">
                Organizations
              </Eyebrow>
              <div className="flex gap-1.5 flex-wrap">
                {user.organizations
                  ?.filter((org) => org.login)
                  .map((org) => (
                    <TooltipProvider key={org.login}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/org/${org.login}`} prefetch={false}>
                            <Image
                              src={org.avatarUrl!}
                              alt={org.login ?? ''}
                              width={32}
                              height={32}
                              className="size-8 rounded-md bg-muted ring-1 ring-border"
                            />
                            <LinkPendingStatus />
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>{org.login}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
              </div>
            </div>
          )}
        </DetailsContainer>
      )}
    </PageContainer>
  );
};
