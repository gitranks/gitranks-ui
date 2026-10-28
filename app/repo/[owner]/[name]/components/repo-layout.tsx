import { format } from 'date-fns';
import {
  Building2,
  CalendarDays,
  Code,
  ExternalLink,
  Star,
  Timer,
  TrendingDown,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { FC, ReactNode } from 'react';
import { FaGithub } from 'react-icons/fa';

import { isRepoRanked } from '../seo';
import { PullButton } from './pull-button';
import { ProfileListItem } from '@/app/profile/[login]/components/profile-list-item';
import {
  ActionsContainer,
  AvatarAndNameContainer,
  AvatarContainer,
  DetailsContainer,
  LeftColumnContainer,
  PageContainer,
} from '@/app/profile/[login]/components/profile-page-backbone';
import { RepoTierChip } from '@/components/repo-tier-chip/repo-tier-chip';
import { Button } from '@/components/ui/button';
import type { PageRepoQuery } from '@/types/generated/graphql';
import { avatarPath, repoOwnerAvatarAlt } from '@/utils/avatar-path';
import { getRepoOwnerPath } from '@/utils/repo-paths';

type RepoLayoutProps = {
  repo: NonNullable<PageRepoQuery['repo']>;
  /** Where the language links to: its repository ranking, when the repository is ranked. */
  languageUrl?: string;
  children: ReactNode;
};

// As wide as the left column, like the profile and organization avatars.
const AVATAR_SIZE = 288;

const mono = (value: number) => <span className="font-mono tabular-nums">{value.toLocaleString('en-US')}</span>;

/** The repository page's frame, like a profile's: the repository on the left, its numbers on the right. */
export const RepoLayout: FC<RepoLayoutProps> = ({ repo, languageUrl, children }) => {
  const { owner, name, nameWithOwner, description, language, stars, gainedThisMonth, createdAt } = repo;
  const readAt = repo.history?.readAt;
  const ownerPath = getRepoOwnerPath(owner, repo.isInOrganization);
  // The page's main image, from this site's own URL: the one its structured data and sitemap name. It answers for any
  // owner, so it is drawn whether or not the repository's data has the owner's avatar.
  const avatar = (
    <Image
      src={avatarPath(owner)}
      alt={repoOwnerAvatarAlt(owner, nameWithOwner)}
      className="h-full w-full rounded-full bg-muted ring-1 ring-border"
      width={AVATAR_SIZE}
      height={AVATAR_SIZE}
      loading="eager"
      fetchPriority="high"
      unoptimized
    />
  );

  return (
    <PageContainer>
      <LeftColumnContainer>
        <AvatarAndNameContainer>
          <AvatarContainer className="shrink-0">
            {/* The owner row below links there too: the avatar is a second way in, out of the tab order. */}
            {ownerPath ? (
              <Link href={ownerPath} prefetch={false} tabIndex={-1} aria-hidden className="block h-full w-full">
                {avatar}
              </Link>
            ) : (
              avatar
            )}
          </AvatarContainer>
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]" translate="no">
              <span className="text-muted-foreground">{owner}/</span>
              {name}
            </h1>
            {isRepoRanked(repo) && !!repo.rank?.tier && <RepoTierChip tier={repo.rank.tier} className="self-start" />}
            {repo.isArchived && (
              <span className="self-start rounded-sm bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                Archived
              </span>
            )}
          </div>
        </AvatarAndNameContainer>
        {!!description && <p className="text-sm [overflow-wrap:anywhere]">{description}</p>}
        <ActionsContainer>
          <PullButton
            owner={owner}
            name={name}
            pull={repo.pull && { status: repo.pull.status, requestedAt: repo.pull.requestedAt }}
          />
          <Button size="sm" variant="outline" className="flex-grow" asChild>
            <Link href={`https://github.com/${nameWithOwner}`} target="_blank" rel="noopener noreferrer">
              <FaGithub aria-hidden />
              Open GitHub
              <ExternalLink className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          </Button>
        </ActionsContainer>
        <DetailsContainer>
          <div className="flex flex-col gap-1.5">
            <ProfileListItem
              value={owner}
              url={ownerPath}
              prefix={repo.isInOrganization ? 'Organization: ' : 'Owner: '}
              Icon={repo.isInOrganization ? Building2 : UserRound}
            />
            <ProfileListItem value={language} url={languageUrl} Icon={Code} />
            <ProfileListItem value={<>{mono(stars)} stars</>} Icon={Star} />
            {!!gainedThisMonth && (
              <ProfileListItem
                value={
                  <>
                    <span className="font-mono tabular-nums">
                      {gainedThisMonth > 0 ? '+' : ''}
                      {gainedThisMonth.toLocaleString('en-US')}
                    </span>{' '}
                    this month
                  </>
                }
                Icon={gainedThisMonth > 0 ? TrendingUp : TrendingDown}
              />
            )}
            {!!createdAt && (
              <ProfileListItem value={`Created ${format(createdAt, 'MMM d, yyyy')}`} Icon={CalendarDays} />
            )}
            {!!readAt && <ProfileListItem value={`Star history read ${format(readAt, 'MMM d, yyyy')}`} Icon={Timer} />}
          </div>
        </DetailsContainer>
      </LeftColumnContainer>
      <section className="flex min-w-0 flex-col gap-6">{children}</section>
    </PageContainer>
  );
};
