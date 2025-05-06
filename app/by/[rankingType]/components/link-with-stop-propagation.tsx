'use client';

import Link from 'next/link';
import { FC, ReactNode } from 'react';

type LinkWithStopPropagationProps = {
  children: ReactNode;
  href: string;
};

export const LinkWithStopPropagation: FC<LinkWithStopPropagationProps> = ({ children, href }) => {
  return (
    <Link href={href} onClick={(event) => event.stopPropagation()} prefetch={false}>
      {children}
    </Link>
  );
};
