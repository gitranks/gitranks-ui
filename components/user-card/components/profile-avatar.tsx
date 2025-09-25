'use client';
import Image from 'next/image';
import { useLinkStatus } from 'next/link';
import type { FC } from 'react';

import { cn } from '@/lib/utils';

type ProfileAvatarProps = {
  url?: string | null;
  login?: string;
  size?: number;
};

export const ProfileAvatar: FC<ProfileAvatarProps> = ({ url, login, size = 32 }) => {
  const { pending } = useLinkStatus();

  if (!url) {
    return null;
  }

  // for retina displays
  const sourceSize = size * 2;

  return (
    <Image
      src={`${url}&s=${sourceSize}`}
      alt={`${login} avatar`}
      className={cn('rounded-full', { 'animate-spin': pending })}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
    />
  );
};
