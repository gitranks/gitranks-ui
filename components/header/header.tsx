import { HomeIcon } from 'lucide-react';
import Link from 'next/link';
import type { FC } from 'react';

import { Logo } from '../logo/logo';
import SigninButton from '../signin-button/signin-button';
import { MainMenu } from './components/main-menu';
import { cn } from '@/lib/utils';

type HeaderProps = {
  login?: string;
};

export const Header: FC<HeaderProps> = ({ login }) => {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between p-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="shrink-0" prefetch={false}>
          <Logo className={cn('h-[22px] sm:block', { hidden: login, block: !login })} />
          {!!login && <HomeIcon className="sm:hidden" />}
        </Link>
        {!!login && <span className="text-xl font-semibold">/</span>}
        <span className="truncate text-xl font-semibold leading-none mt-[-3]">{login}</span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <MainMenu />
        <SigninButton />
      </div>
    </header>
  );
};
