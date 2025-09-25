import type { FC } from 'react';

import { LinkWithStopPropagation } from './components/link-with-stop-propagation';
import { ProfileAvatar } from './components/profile-avatar';
import type { UserCardProps } from './user-card.types';

export const UserCard: FC<UserCardProps> = ({ login, avatarUrl, size, className }) => {
  if (!login) {
    return null;
  }

  return (
    <LinkWithStopPropagation href={`/profile/${login}`} className={className}>
      <ProfileAvatar url={avatarUrl} login={login} size={size} />
      <span translate="no">{login}</span>
    </LinkWithStopPropagation>
  );
};
