import Image from 'next/image';
import Link from 'next/link';

import SigninButton from '../signin-button/signin-button';

export const Header = () => {
  return (
    <header className="flex items-center justify-between p-4">
      <Link href="/">
        <Image src="/logo-light.svg" alt="Logo Light" className="block dark:hidden" priority width={100} height={20} />
        <Image src="/logo-dark.svg" alt="Logo Dark" className="hidden dark:block" priority width={100} height={20} />
      </Link>

      <SigninButton />
    </header>
  );
};
