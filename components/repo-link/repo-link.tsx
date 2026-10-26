import type { FC } from 'react';

import { LinkWithStopPropagation } from '@/components/user-card/components/link-with-stop-propagation';
import { ProfileAvatar } from '@/components/user-card/components/profile-avatar';
import { getRepoPath } from '@/utils/repo-paths';

type RepoLinkProps = {
  nameWithOwner: string;
  ownerAvatarUrl?: string | null;
  size?: number;
  className?: string;
};

/** The owner's avatar and `owner/name`, linking to the repository page. */
export const RepoLink: FC<RepoLinkProps> = ({ nameWithOwner, ownerAvatarUrl, size, className }) => (
  <LinkWithStopPropagation href={getRepoPath(nameWithOwner)} className={className}>
    <ProfileAvatar url={ownerAvatarUrl} login={nameWithOwner.split('/')[0]} size={size} />
    <span translate="no" className="min-w-0 [overflow-wrap:anywhere]">
      {nameWithOwner}
    </span>
  </LinkWithStopPropagation>
);
