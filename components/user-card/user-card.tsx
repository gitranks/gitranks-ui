import { FC } from 'react';

import { getInitials } from '@/utils/get-initials';

import { LinkWithStopPropagation } from './components/link-with-stop-propagation';
import { ProfileAvatar } from './components/profile-avatar';
import { UserCardProps } from './user-card.types';

export const UserCard: FC<UserCardProps> = ({ login, avatarUrl, avatarClassName }) => {
  if (!login) {
    return null;
  }

  return (
    <LinkWithStopPropagation href={`/profile/${login}`}>
      <ProfileAvatar url={avatarUrl} initials={getInitials(login)} className={avatarClassName} />
      {login}
    </LinkWithStopPropagation>
  );
};
