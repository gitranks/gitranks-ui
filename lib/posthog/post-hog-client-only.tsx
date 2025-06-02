'use client';

import dynamic from 'next/dynamic';

export const PostHogClientOnlyProvider = dynamic(
  () => import('./post-hog-provider').then((mod) => mod.PostHogProvider),
  {
    ssr: false,
  },
);
