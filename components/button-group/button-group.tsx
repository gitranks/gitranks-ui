import type { Route } from 'next';
import Link from 'next/link';
import { FC, ReactNode } from 'react';

import { cn } from '@/lib/utils';

const GROUP_CLASSNAME =
  'bg-muted text-muted-foreground inline-flex h-8 w-fit items-center justify-center rounded-lg p-[2px]';
const ITEM_CLASSNAME =
  "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

type ButtonGroupProps = {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export const ButtonGroup: FC<ButtonGroupProps> = ({ children, className, style }) => {
  return (
    <div className={cn(GROUP_CLASSNAME, className)} style={style}>
      {children}
    </div>
  );
};

type LinkGroupItemProps = {
  href: string;
  active?: boolean;
  children: ReactNode;
};

export const LinkGroupItem: FC<LinkGroupItemProps> = ({ href, active, children }) => {
  return (
    <Link href={href as Route} data-state={active ? 'active' : undefined} className={ITEM_CLASSNAME}>
      {children}
    </Link>
  );
};

type ButtonGroupItemProps = {
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
};
export const ButtonGroupItem: FC<ButtonGroupItemProps> = ({ onClick, active, children }) => {
  return (
    <button onClick={onClick} data-state={active ? 'active' : undefined} className={ITEM_CLASSNAME}>
      {children}
    </button>
  );
};
