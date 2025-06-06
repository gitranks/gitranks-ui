'use client';

import { useRouter } from 'next/navigation';
import { FC } from 'react';

import { TableRow } from '@/components/ui/table';

type ClickableRowProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export const ClickableRow: FC<ClickableRowProps> = ({ children, href, className }) => {
  const router = useRouter();

  const onClick = () => {
    router.push(href);
  };

  return (
    <TableRow className={className} onClick={onClick}>
      {children}
    </TableRow>
  );
};
