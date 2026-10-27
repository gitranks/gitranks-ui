'use client';

import { useSession } from 'next-auth/react';
import type { ReactNode } from 'react';

import { Tab } from '@/components/tabs/tabs';
import { loginFromPath } from '@/utils/login-from-path';

/**
 * A tab only the signed-in owner of the profile sees. The layout is cached for everyone, so the session is read here,
 * in the browser; the tab's page and its server routes check it again.
 */
export function OwnerTab({ login, href, children }: { login: string; href: string; children: ReactNode }) {
  const { data: session } = useSession();
  const owner = session?.user.githubLogin?.toLowerCase() === loginFromPath(login).toLowerCase();
  return owner ? <Tab href={href}>{children}</Tab> : null;
}
