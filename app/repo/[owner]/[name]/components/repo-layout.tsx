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

import { PullButton } from './pull-button';
import { ProfileListItem } from '@/app/profile/[login]/components/profile-list-item';
import {
  ActionsContainer,
  DetailsContainer,
  LeftColumnContainer,
  PageContainer,
} from '@/app/profile/[login]/components/profile-page-backbone';
import { Button } from '@/components/ui/button';
import type { PageRepoQuery } from '@/types/generated/graphql';
import { getRepoOwnerPath } from '@/utils/repo-paths';

type RepoLayoutProps = {
  repo: NonNullable<PageRepoQuery['repo']>;
  /** Where the language links to: its repository ranking, when the repository is ranked. */
  languageUrl?: string;
  children: ReactNode;
};

const AVATAR_SIZE = 96;

const mono = (value: number) => <span className="font-mono tabular-nums">{value.toLocaleString('en-US')}</span>;

/** The repository page's frame, like a profile's: the repository on the left, its numbers on the right. */
export const RepoLayout: FC<RepoLayoutProps> = ({ repo, languageUrl, children }) => {
  const { owner, name, nameWithOwner, ownerAvatarUrl, description, language, stars, gainedThisMonth, createdAt } = repo;
  const readAt = repo.history?.readAt;
  const ownerPath = getRepoOwnerPath(owner, repo.isInOrganization);
  const avatar = !!ownerAvatarUrl && (
    <Image
      src={`${ownerAvatarUrl}&s=${AVATAR_SIZE * 2}`}
      alt={`${owner} avatar`}
      className="size-16 shrink-0 rounded-full bg-muted ring-1 ring-border md:size-24"
      width={AVATAR_SIZE}
      height={AVATAR_SIZE}
      loading="eager"
      fetchPriority="high"
    />
  );

  return (
    <PageContainer>
      <LeftColumnContainer>
        <div className="flex flex-row items-center gap-4 md:flex-col md:items-start">
          {/* The owner row below links there too: the avatar is a second way in, out of the tab order. */}
          {ownerPath && avatar ? (
            <Link href={ownerPath} prefetch={false} tabIndex={-1} aria-hidden className="shrink-0">
              {avatar}
            </Link>
          ) : (
            avatar
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]" translate="no">
              <span className="text-muted-foreground">{owner}/</span>
              {name}
            </h1>
            {repo.isArchived && (
              <span className="self-start rounded-sm bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                Archived
              </span>
            )}
          </div>
        </div>
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
