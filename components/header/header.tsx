import { HomeIcon } from 'lucide-react';
import Link from 'next/link';
import type { FC, ReactNode } from 'react';

import { Logo } from '../logo/logo';
import SigninButton from '../signin-button/signin-button';
import { MainMenu } from './components/main-menu';
import { cn } from '@/lib/utils';

type HeaderProps = {
  /** Text after the logo and a "/": a profile's login, or a section's name. Not a link. */
  title?: string;
  /** In place of the site's main menu, on the right; `null` for none. */
  menu?: ReactNode;
  /** In place of the site's sign-in, after the menu; `null` for none. */
  account?: ReactNode;
};

export const Header: FC<HeaderProps> = ({ title, menu = <MainMenu />, account = <SigninButton /> }) => {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between p-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="shrink-0" prefetch={false}>
          <Logo className={cn('h-[22px] sm:block', { hidden: title, block: !title })} />
          {!!title && <HomeIcon className="sm:hidden" />}
        </Link>
        {!!title && <span className="text-xl font-semibold">/</span>}
        <span className="truncate text-xl font-semibold leading-none mt-[-3]">{title}</span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {menu}
        {account}
      </div>
    </header>
  );
};
