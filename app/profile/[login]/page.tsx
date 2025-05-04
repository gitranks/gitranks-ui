import { formatDistanceToNow } from 'date-fns';
import {
  BriefcaseBusiness,
  ExternalLink,
  Hourglass,
  Link2,
  Mail,
  MapPin,
  RefreshCw,
  Timer,
  UsersRound,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { Page } from '@/components/page/page';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { graphqlRequest } from '@/lib/graphql-request';
import { ProfileForMetadataDocument, UserDocument } from '@/types/generated/graphql';

import { ProfileListItem } from './components/profile-list-item';
import { RanksOverview } from './components/ranks-overview';
import { RepositoriesOverview } from './components/repositories-overiview';
import { getSocialIcon } from './utils/get-social-icon';

type Props = {
  params: Promise<{ login: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { login } = await params;
  const { rankByLogin } = (await graphqlRequest(ProfileForMetadataDocument, { login })) ?? {};

  if (!rankByLogin?.user) {
    return { title: 'GitHub Profile Analytics & Rankings · GitRanks' };
  }

  return {
    title: `${login} – GitHub Profile Analytics & Rankings · GitRanks`,
    openGraph: {
      images: [rankByLogin.user.avatarUrl!],
    },
  };
}

export default async function Profile({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  const { user } = (await graphqlRequest(UserDocument, { login })) ?? {};

  const showContact = !!user?.email || !!user?.websiteUrl || !!user?.socialAccounts?.nodes?.length;

  return (
    <Page className="gap-6 flex-row">
      <div className="w-3xs xl:w-2xs flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <AspectRatio ratio={1}>
            <Avatar className="w-full h-full rounded-full" asChild>
              <AvatarImage src={user.avatarUrl!} />
            </Avatar>
          </AspectRatio>
          <div>
            <h1 className="font-semibold text-2xl">{user.name}</h1>
            <h2 className="text-muted-foreground">@{user.login}</h2>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <Button className="w-full">
            Refresh
            <RefreshCw className="size-4" />
          </Button>
          <Button variant="secondary" className="w-full" asChild>
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
              <ProfileListItem value={user.email} Icon={Mail} />
              <ProfileListItem value={user.websiteUrl} Icon={Link2} />
              {user.socialAccounts?.nodes?.map((account) => (
                <ProfileListItem
                  key={account.displayName}
                  value={account.displayName}
                  Icon={getSocialIcon(account.provider)}
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
      <div className="flex-grow flex flex-col gap-6">
        <div className="flex flex-wrap gap-6">
          <RanksOverview ranksData={user.rank} />
          <RepositoriesOverview
            repositories={user.repositories}
            contributions={user.contributions}
            ownedStars={user.ownedStars}
            contributedStars={user.contributedStars}
          />
        </div>
        <div>Feed</div>
      </div>
    </Page>
  );
}
