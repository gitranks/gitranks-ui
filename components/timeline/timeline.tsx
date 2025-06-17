import { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export const Timeline = ({ children }: { children: ReactNode }) => {
  return <ol className="relative border-s">{children}</ol>;
};

export const TimelineItem = ({ children }: { children: ReactNode }) => {
  return (
    <li className="mb-10 ms-4 last:mb-0">
      <div className="absolute w-3 h-3 bg-border rounded-full mt-1.5 -start-1.5 border"></div>
      {children}
    </li>
  );
};

export const TimelineTime = ({ children }: { children: ReactNode }) => {
  return <time className="mb-1 text-sm font-normal text-muted-foreground">{children}</time>;
};

export const TimelineDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <div className={cn(className)}>{children}</div>;
};
