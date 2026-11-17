'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { mainMenuItemClass } from './menu-styles';
import { Pill } from '@/components/pill/pill';
import { NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu';
import { learnOpenInBrowser, learnOpenKnown } from '@/lib/learn/learn-open';
import { LEARN_PATH } from '@/lib/learn/learn-path';
import { cn } from '@/lib/utils';

/** "Learn · New", the link drawn alone: for the menu and the catalogue's boards. */
export function LearnMenuLink({ active }: Readonly<{ active?: boolean }>) {
  return (
    <NavigationMenuItem>
      <NavigationMenuLink className={cn(mainMenuItemClass, 'gap-1.5')} active={active} asChild>
        <Link href={LEARN_PATH} prefetch={false}>
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
 * "Learn · New", only for a signed-in viewer Learn is open to: asked in the browser once the page is up, as pages are
 * cached for everyone. Nothing until the answer comes, signed out, or closed.
 */
export function LearnMenuItem({ active }: Readonly<{ active?: boolean }>) {
  const { data: session } = useSession();
  const login = session && !session.error ? (session.user?.githubLogin ?? null) : null;
  // Known already after a first answer, so moving between pages does not flash it in.
  const [open, setOpen] = useState(() => learnOpenKnown(login) === true);

  useEffect(() => {
    let live = true;
    learnOpenInBrowser(login).then((answer) => {
      if (live) setOpen(answer);
    });
    return () => {
      live = false;
    };
  }, [login]);

  return open && login ? <LearnMenuLink active={active} /> : null;
}
