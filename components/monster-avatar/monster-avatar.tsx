'use client';
import { type FC, type LazyExoticComponent, lazy, type ReactNode, Suspense, type SVGProps, useMemo } from 'react';

// map each index to a dynamic-import factory
const AvatarMap: Record<number, LazyExoticComponent<(props: SVGProps<SVGSVGElement>) => ReactNode>> = {
  1: lazy(() => import('./svg/monster-1')),
  2: lazy(() => import('./svg/monster-2')),
  3: lazy(() => import('./svg/monster-3')),
  4: lazy(() => import('./svg/monster-4')),
  5: lazy(() => import('./svg/monster-5')),
  6: lazy(() => import('./svg/monster-6')),
  7: lazy(() => import('./svg/monster-7')),
  8: lazy(() => import('./svg/monster-8')),
  9: lazy(() => import('./svg/monster-9')),
  10: lazy(() => import('./svg/monster-10')),
};

type RandomMonsterAvatarProps = {
  className?: string;
};

const RandomMonsterAvatar: FC<RandomMonsterAvatarProps> = ({ className }) => {
  const idx = useMemo(() => Math.floor(Math.random() * 10) + 1, []);
  const Chosen = AvatarMap[idx];

  return (
    <Suspense fallback={<div>Loading avatar…</div>}>
      <Chosen className={className} />
    </Suspense>
  );
};

export default RandomMonsterAvatar;
