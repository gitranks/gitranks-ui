import 'server-only';

import { cacheLife } from 'next/cache';

import { buildOpenToEveryone } from './build-everyone';

/**
 * Whether Build is open to everyone, for pages that list Build's addresses (the sitemaps): the proxy's answer
 * (`buildOpenToEveryone`, which fails closed), kept for minutes, so opening Build reaches them soon.
 */
export async function loadBuildOpenToEveryone(): Promise<boolean> {
  'use cache';
  cacheLife('minutes');
  return buildOpenToEveryone(Date.now());
}
