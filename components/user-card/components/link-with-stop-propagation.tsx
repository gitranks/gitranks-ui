'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { FC, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type LinkWithStopPropagationProps = {
  children: ReactNode;
  href: string;
  className?: string;
};

export const LinkWithStopPropagation: FC<LinkWithStopPropagationProps> = ({ children, href, className }) => {
  return (
    <Link
      href={href as Route}
      onClick={(event) => event.stopPropagation()}
      prefetch={false}
      className={cn('flex items-center gap-2', className)}
    >
      {children}
    </Link>
  );
};
