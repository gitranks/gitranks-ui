import Link from 'next/link';
import type { FC } from 'react';

import { Logo, LogoMark } from '../logo/logo';
import SigninButton from '../signin-button/signin-button';
import { MainMenu, type MenuSection } from './components/main-menu';
import { cn } from '@/lib/utils';

type HeaderProps = {
  /** Text after the logo and a "/": a profile's login, or a section's name. Not a link. */
  title?: string;
  /** The menu item to mark: the section the page belongs to. Set by the section's layout, as the header reads no path. */
  section?: MenuSection;
};

export const Header: FC<HeaderProps> = ({ title, section }) => {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between p-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="shrink-0" prefetch={false}>
          <Logo className={cn('h-[22px] sm:block', { hidden: title, block: !title })} />
          {/* On a phone the mark alone, so the title has the room. */}
          {!!title && <LogoMark className="size-6 sm:hidden" />}
        </Link>
        {!!title && <span className="text-xl font-semibold">/</span>}
        <span className="truncate text-xl font-semibold leading-none mt-[-3]">{title}</span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <MainMenu section={section} />
        <SigninButton />
      </div>
    </header>
  );
};
