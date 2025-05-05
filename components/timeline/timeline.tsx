import { format, parseISO } from 'date-fns';

import { cn } from '@/lib/utils';

export const Timeline = ({ children }: { children: React.ReactNode }) => {
  return <ol className="relative border-s border-border">{children}</ol>;
};

export const TimelineItem = ({ children }: { children: React.ReactNode }) => {
  return (
    <li className="mb-10 ms-4 last:mb-0">
      <div className="absolute w-3 h-3 bg-border rounded-full mt-1.5 -start-1.5 border border-border"></div>
      {children}
    </li>
  );
};

export const TimelineTime = ({ isoDate }: { isoDate: string }) => {
  const formatted = format(parseISO(isoDate), 'dd MMM yyyy');
  return <time className="mb-1 text-sm font-normal text-muted-foreground">{formatted}</time>;
};

export const TimelineTitle = ({ children }: { children: React.ReactNode }) => {
  return <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{children}</h3>;
};

export const TimelineDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <div className={cn(className)}>{children}</div>;
};
