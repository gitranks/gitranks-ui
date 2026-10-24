import type { FC, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type TabsBarProps = {
  children: ReactNode;
  className?: string;
};

export const TabsBar: FC<TabsBarProps> = ({ children, className }) => {
  return (
    <div className={cn('text-sm text-center text-muted-foreground border-b', className)}>
      <ul className="mx-auto flex w-full max-w-7xl -mb-px overflow-x-auto [scrollbar-width:none]">{children}</ul>
    </div>
  );
};
