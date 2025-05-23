import NextLink from 'next/link';
import { FC } from 'react';

import { cn } from '@/lib/utils';

import { LinkProps } from './link.types';

export const Link: FC<LinkProps> = ({ children, className, href, ...props }) => {
  return (
    <NextLink
      className={cn('text-link hover:text-link/95 transition-colors duration-200 underline', className)}
      href={href}
      {...props}
    >
      {children}
    </NextLink>
  );
};
