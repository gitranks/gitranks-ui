import { FC } from 'react';

import { cn } from '@/lib/utils';

type PageGridProps = {
  children: React.ReactNode;
  className?: string;
};

export const PageGrid: FC<PageGridProps> = ({ children, className }) => {
  return <div className={cn('grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-4', className)}>{children}</div>;
};
