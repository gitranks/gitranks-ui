import type { Route } from 'next';
import Link from 'next/link';
import type { FC, ReactNode } from 'react';

import { NavigationMenuLink } from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';

type ListItemProps = {
  className?: string;
  href: string;
  children: ReactNode;
};

/** A link in a header submenu, with its icon. */
export const ListItem: FC<ListItemProps> = ({ className, children, href }) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          className={cn(
            'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
            className,
          )}
          href={href as Route}
          prefetch
        >
          <div className="flex gap-2 items-center">{children}</div>
        </Link>
      </NavigationMenuLink>
    </li>
  );
};
