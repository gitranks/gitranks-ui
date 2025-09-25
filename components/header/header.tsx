import { HomeIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { FC } from 'react';

import { cn } from '@/lib/utils';

import SigninButton from '../signin-button/signin-button';
import { MainMenu } from './components/main-menu';

type HeaderProps = {
  login?: string;
};

export const Header: FC<HeaderProps> = ({ login }) => {
  return (
    <header className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <Link href="/" className="shrink-0">
          <Image
            src="/logo-light.svg"
            alt="Logo Light"
            className={cn('dark:hidden sm:block', { hidden: login, block: !login })}
            priority
            width={96}
            height={21}
          />
          <Image
            src="/logo-dark.svg"
            alt="Logo Dark"
            className={cn('hidden dark:block sm:dark:block', { 'dark:hidden': login, 'dark:block': !login })}
            priority
            width={96}
            height={21}
          />
          {!!login && <HomeIcon className="sm:hidden" />}
        </Link>
        {!!login && <span className="text-xl font-semibold">/</span>}
        <span className="text-xl font-semibold leading-none -mt-[3]">{login}</span>
      </div>

      <div className="flex items-center gap-3">
        <MainMenu className={cn('sm:block', { hidden: login, block: !login })} />
        <SigninButton />
      </div>
    </header>
  );
};
