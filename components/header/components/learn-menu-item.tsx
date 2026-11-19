'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { mainMenuItemClass } from './menu-styles';
import { Pill } from '@/components/pill/pill';
import { NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu';
import {
  learnOpenInBrowser,
  learnOpenKnown,
  learnOpenToVisitorsInBrowser,
  learnOpenToVisitorsKnown,
} from '@/lib/learn/learn-open';
import { LEARN_PATH } from '@/lib/learn/learn-path';
import { cn } from '@/lib/utils';
import { contributeSource } from '@/lib/workspace/click-tracking';

/** "Learn · New", the link drawn alone: for the menu and the catalogue's boards. */
export function LearnMenuLink({ active }: Readonly<{ active?: boolean }>) {
  return (
    <NavigationMenuItem>
      <NavigationMenuLink className={cn(mainMenuItemClass, 'gap-1.5')} active={active} asChild>
        <Link href={LEARN_PATH} prefetch={false} {...contributeSource('learn_menu')}>
          Learn
          <Pill tone="violet" size="small">
            New
          </Pill>
        </Link>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}

/**
 * "Learn · New", for a signed-in viewer Learn is open to, and for a visitor once it is open to everyone: asked in the
 * browser once the page is up, as pages are cached for everyone. Nothing until the answer comes, or closed.
 */
export function LearnMenuItem({ active }: Readonly<{ active?: boolean }>) {
  const { data: session, status } = useSession();
  const login = session && !session.error ? (session.user?.githubLogin ?? null) : null;
  const visitor = status === 'unauthenticated' || Boolean(session?.error);
  // Known already after a first answer, so moving between pages does not flash it in.
  const [open, setOpen] = useState(() => (login ? learnOpenKnown(login) : learnOpenToVisitorsKnown()) === true);

  useEffect(() => {
    if (!login && !visitor) return;
    let live = true;
    (login ? learnOpenInBrowser(login) : learnOpenToVisitorsInBrowser()).then((answer) => {
      if (live) setOpen(answer);
    });
    return () => {
      live = false;
    };
  }, [login, visitor]);

  return open && (login || visitor) ? <LearnMenuLink active={active} /> : null;
}
