'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type FC, useTransition } from 'react';

import { useReportPendingNavigation } from '@/components/navigation-progress/navigation-progress';
import { TableRow } from '@/components/ui/table';

type ClickableRowProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export const ClickableRow: FC<ClickableRowProps> = ({ children, href, className }) => {
  const router = useRouter();
  // Profile and org pages have no loading.tsx: show the progress bar until the page is ready.
  const [isPending, startTransition] = useTransition();
  useReportPendingNavigation(isPending);

  const onClick = () => {
    startTransition(() => {
      router.push(href as Route);
    });
  };

  return (
    <TableRow className={className} onClick={onClick}>
      {children}
    </TableRow>
  );
};
