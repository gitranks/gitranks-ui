'use client';
import { AvatarFallback } from '@radix-ui/react-avatar';
import { useLinkStatus } from 'next/link';
import { FC } from 'react';

import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type ProfileAvatarProps = {
  url?: string | null;
  initials?: string | null;
  className?: string;
};

export const ProfileAvatar: FC<ProfileAvatarProps> = ({ url, initials, className }) => {
  const { pending } = useLinkStatus();

  if (!url) {
    return null;
  }

  return (
    <Avatar className={className}>
      <AvatarImage src={url} className={cn('rounded-full', { 'animate-spin': pending })} />
      <AvatarFallback className="flex items-center justify-center">{initials}</AvatarFallback>
    </Avatar>
  );
};
