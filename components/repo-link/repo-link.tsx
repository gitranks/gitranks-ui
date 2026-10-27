import type { FC } from 'react';

import { RepoTierAvatarBadge } from '@/components/repo-tier-chip/repo-tier-chip';
import { LinkWithStopPropagation } from '@/components/user-card/components/link-with-stop-propagation';
import { ProfileAvatar } from '@/components/user-card/components/profile-avatar';
import { getRepoPath } from '@/utils/repo-paths';

type RepoLinkProps = {
  nameWithOwner: string;
  ownerAvatarUrl?: string | null;
  size?: number;
  className?: string;
  /** The repository's tier, as a badge on the owner avatar. */
  tier?: { tier: number; level: number } | null;
};

/** The owner's avatar and `owner/name`, linking to the repository page. */
export const RepoLink: FC<RepoLinkProps> = ({ nameWithOwner, ownerAvatarUrl, size, className, tier }) => (
  <LinkWithStopPropagation href={getRepoPath(nameWithOwner)} className={className}>
    {tier ? (
      <span className="relative shrink-0">
        <ProfileAvatar url={ownerAvatarUrl} login={nameWithOwner.split('/')[0]} size={size} />
        <RepoTierAvatarBadge tier={tier} />
      </span>
    ) : (
      <ProfileAvatar url={ownerAvatarUrl} login={nameWithOwner.split('/')[0]} size={size} />
    )}
    <span translate="no" className="min-w-0 [overflow-wrap:anywhere]">
      {nameWithOwner}
    </span>
  </LinkWithStopPropagation>
);
