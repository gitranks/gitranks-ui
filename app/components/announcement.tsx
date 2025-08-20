import { FC } from 'react';

import { cn } from '@/lib/utils';

const CLIP_PATH =
  'polygon(74.8% 41.9%, 97.2% 73.2%, 100% 34.9%, 92.5% 0.4%, 87.5% 0%, 75% 28.6%, 58.5% 54.6%, 50.1% 56.8%, 46.9% 44%, 48.3% 17.4%, 24.7% 53.9%, 0% 27.9%, 11.9% 74.2%, 24.9% 54.1%, 68.6% 100%, 74.8% 41.9%)';

const BgHelper: FC<{ className?: string }> = ({ className }) => {
  return (
    <div aria-hidden="true" className={cn(`absolute top-1/2 -z-10 -translate-y-1/2 transform-gpu blur-2xl`, className)}>
      <div
        style={{ clipPath: CLIP_PATH }}
        className="aspect-577/310 w-144.25 bg-linear-to-r from-[#ff80b5] to-[#9089fc] opacity-40"
      />
    </div>
  );
};

export const Announcement = () => {
  return (
    <div className="relative isolate flex items-center justify-center flex-wrap gap-x-4 gap-y-1 overflow-hidden bg-gray-50 dark:bg-gray-800/50 px-2 py-2.5 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-white/10">
      <BgHelper className="left-[max(-7rem,calc(50%-52rem))]" />
      <BgHelper className="left-[max(45rem,calc(50%+8rem))]" />
      <p className="text-sm/6 text-gray-900 dark:text-gray-100">
        <strong className="font-semibold">We are live on Product Hunt today - check it out</strong>
      </p>
      <a
        href="https://www.producthunt.com/products/gitranks?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-gitranks"
        target="_blank"
      >
        <img
          src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=988220&theme=light&t=1755193761436"
          alt="GitRanks - GitHub&#0032;Profile&#0032;Analytics&#0032;&#0038;&#0032;Rankings | Product Hunt"
          style={{ height: '36px' }}
          className="dark:hidden"
        />
        <img
          src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=988220&theme=dark&t=1755193761436"
          alt="GitRanks - GitHub&#0032;Profile&#0032;Analytics&#0032;&#0038;&#0032;Rankings | Product Hunt"
          style={{ height: '36px' }}
          className="hidden dark:block"
        />
      </a>
    </div>
  );
};
