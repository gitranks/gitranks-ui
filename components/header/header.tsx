import Link from 'next/link';
import type { FC } from 'react';

import { Logo, LogoMark } from '../logo/logo';
import SigninButton from '../signin-button/signin-button';
import { MainMenu, type MenuSection } from './components/main-menu';
import type { BuildViewer } from '@/components/build/build-viewer';
import type { InterviewsViewer } from '@/components/interviews/interviews-viewer';
import { cn } from '@/lib/utils';

type HeaderProps = {
  /** Text after the logo and a "/": a profile's login, or a section's name. Not a link. */
  title?: string;
  /**
   * The menu item to mark: the section the page belongs to. Left out, Contribute and Learn (or Grow, and the section in
   * its list) mark themselves on their own pages by the path (the workspace's layout reads none), and nothing on the
   * workspace's pages under `/my`.
   */
  section?: MenuSection;
  /** Whether the viewer has a build (Grow's "New"), for the design boards; left out, the browser reads it. */
  build?: BuildViewer;
  /** Whether Interviews is open to the viewer, for the design boards; left out, the browser reads it. */
  interviews?: InterviewsViewer;
};

export const Header: FC<HeaderProps> = ({ title, section, build, interviews }) => {
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
        <MainMenu section={section} build={build} interviews={interviews} />
        <SigninButton />
      </div>
    </header>
  );
};
