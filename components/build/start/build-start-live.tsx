'use client';

import { signIn } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

import { type BuildStartProject, BuildStartScreen } from './build-start-screen';
import { AgentConnect } from '@/components/workspace/agent/agent-connect';
import { TimeZoneNote } from '@/components/workspace/time-zone-note';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { buildStartMinePath } from '@/lib/build/paths';
import { BUILD_AGENT_VARIANT, buildStartStageOf, mergeBuildStart } from '@/lib/build/start';
import type { BuildProjectCard, BuildStart } from '@/lib/build/types';
import { AGENT_POLL_MS } from '@/lib/workspace/agent-connect';
import { MCP_CLIENT_NAMES, type McpClient } from '@/lib/workspace/mcp-setup';

export type BuildStartLiveProps = {
  signedIn: boolean;
  /** The state the server read; null signed out, and when it could not be read. */
  start: BuildStart | null;
  /** The live project the address names (`?project=`); none when it names none. */
  project: BuildProjectCard | null;
  /** Every live project, for the list to pick from. */
  projects: BuildProjectCard[];
  /** When the server drew the page: a sign-in after it is an agent calling, for "Connect another agent". */
  openedAt: string;
};

/**
 * The start flow with its state. While the page is shown and the build has not started, it reads the flow's state
 * again every few seconds (`/api/me/build/start`, as the connect steps ask whether the agent called), and moves on in
 * place: step 2 opens when the agent calls, and says the build has started when it has. Someone whose agent connected
 * before lands on step 2. A visitor signs in first and comes back to this very address.
 */
export function BuildStartLive({ signedIn, start: initial, project, projects, openedAt }: BuildStartLiveProps) {
  const [start, setStart] = useState(initial);
  // The agent picked here: named once it calls, whether this page or the connect steps hear of it first.
  const [client, setClient] = useState<McpClient | null>(null);
  const [connectedHere, setConnectedHere] = useState(false);
  const [another, setAnother] = useState(false);
  const [picked, setPicked] = useState<BuildProjectCard | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  // A read answered nothing (signed out since, or a failure): the page stops asking and says so.
  const [lost, setLost] = useState(false);
  // Since when a sign-in is an agent calling: the page's drawing, or the press of "Connect another agent".
  const [since, setSince] = useState(openedAt);
  const projectHeading = useRef<HTMLHeadingElement>(null);

  const stage = buildStartStageOf({ signedIn, start, connectedHere });
  const shown = picked ?? project;
  const slug = shown?.slug ?? null;
  const started = !!start?.build;

  // The flow's state, read again while the page is shown, until the build has started.
  useEffect(() => {
    if (!signedIn || started || lost) return;
    let stopped = false;
    let asking = false;
    const ask = async () => {
      if (stopped || asking || document.visibilityState !== 'visible') return;
      asking = true;
      try {
        const response = await fetch(buildStartMinePath(slug), { cache: 'no-store' });
        if (!response.ok) {
          if (!stopped) setLost(true);
          return;
        }
        const { start: read } = (await response.json()) as { start: BuildStart | null };
        if (stopped) return;
        // Signed out since, or the state could not be read: stop asking, and say so.
        if (!read) setLost(true);
        else setStart((held) => mergeBuildStart(held, read));
      } catch {
        // Offline, or a deploy under way: the next read tries again.
      } finally {
        asking = false;
      }
    };
    const timer = setInterval(ask, AGENT_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [signedIn, started, lost, slug]);

  // Step 2 takes the focus as it opens, and as it changes in place.
  const moved = useRef(stage);
  useEffect(() => {
    if (moved.current === stage) return;
    moved.current = stage;
    if (stage === 'project' || stage === 'started') projectHeading.current?.focus();
  }, [stage]);

  const view: BuildStartProject = shown
    ? { kind: 'say', project: shown, from: picked ? 'list' : 'address' }
    : { kind: 'pick', projects };

  const connect = (
    <AgentConnect
      embedded
      signIn
      // Never Contribute's onboarded stamp: someone onboarded with a Claude key has no agent. The wait is for a sign-in
      // after the page opened, or after "Connect another agent"; the page's own read catches the API's word.
      onboarded
      tokens={[]}
      keyLink={false}
      openedAt={since}
      withVsCode
      variant={BUILD_AGENT_VARIANT}
      onAdded={setClient}
      onConnected={(called) => {
        setClient(called);
        setConnectedHere(true);
        setAnother(false);
      }}
    />
  );

  return (
    <>
      {/* Once the flow is read for the person, the browser's zone is sent: saved before any build, so none of a
          builder's days is counted in the default zone. */}
      {start ? <TimeZoneNote /> : null}
      <BuildStartScreen
        stage={stage}
        connect={connect}
        agent={client ? MCP_CLIENT_NAMES[client] : null}
        another={another}
        onAnother={() => {
          if (!another) setSince(new Date().toISOString());
          setAnother(!another);
        }}
        project={view}
        onPick={(each) => {
          setPicked(each);
          projectHeading.current?.focus();
        }}
        onPickAnother={() => {
          setPicked(null);
          projectHeading.current?.focus();
        }}
        build={start?.build ?? null}
        signingIn={signingIn}
        onSignIn={() => {
          setSigningIn(true);
          const here = `${window.location.pathname}${window.location.search}`;
          signIn(IDENTITY_PROVIDER, { redirectTo: here }).catch(() => setSigningIn(false));
        }}
        projectHeadingRef={projectHeading}
        lost={lost}
      />
    </>
  );
}
