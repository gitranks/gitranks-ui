'use client';

import { useEffect, useState } from 'react';

import { HomeLanding } from './home-landing';
import { readKey } from './home-live';
import { buildStartMinePath } from '@/lib/build/paths';
import type { BuildProjectCard, BuildStart } from '@/lib/build/types';
import { hasSessionHint } from '@/lib/session-hint';

/**
 * "How Build works" as it lives in the browser: the landing for everyone, whose main button turns in place into "Pick
 * a project" once the person's agent is known to have connected, as on Home. A visitor asks for nothing.
 */
export function AboutLive({ projects }: { projects: readonly BuildProjectCard[] }) {
  const [agentConnected, setAgentConnected] = useState(false);

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) return;
    let live = true;
    void readKey<BuildStart>(buildStartMinePath(), 'start').then((start) => {
      if (live && start?.agentConnected === true) setAgentConnected(true);
    });
    return () => {
      live = false;
    };
  }, []);

  return <HomeLanding projects={projects} agentConnected={agentConnected} about />;
}
