'use client';
import { AvatarFallback } from '@radix-ui/react-avatar';
import { useLinkStatus } from 'next/link';
import { FC } from 'react';

import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type ProfileAvatarProps = {
  url?: string | null;
  initials?: string | null;
};

export const ProfileAvatar: FC<ProfileAvatarProps> = ({ url, initials }) => {
  const { pending } = useLinkStatus();

  if (!url) {
    return null;
  }

  return (
    <Avatar>
      <AvatarImage src={url} className={cn('rounded-full', { 'animate-spin': pending })} width={36} height={36} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
};
