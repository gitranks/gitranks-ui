import type { Route } from 'next';
import NextLink from 'next/link';
import type { FC } from 'react';

import type { LinkProps } from './link.types';
import { cn } from '@/lib/utils';

export const Link: FC<LinkProps> = ({ children, className, href, ...props }) => {
  return (
    <NextLink
      className={cn('text-link hover:text-link/95 transition-colors duration-200 underline', className)}
      href={href as Route}
      {...props}
    >
      {children}
    </NextLink>
  );
};
