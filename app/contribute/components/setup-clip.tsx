'use client';

import { useEffect, useRef } from 'react';

/** Served from `/media`, cached for a year (next.config): a new cut gets a new name. */
const SRC = '/media/contribute-one-command-v1.mp4';
const POSTER = '/media/contribute-one-command-v1.jpg';

/**
 * The Claude Code setup in one muted loop: install the plugin, sign in once here, ask for an issue, the picks. It
 * loads and plays only while on screen, and never by itself under reduced motion; its controls pause it or open it
 * full screen.
 */
export function SetupClip() {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = video.current;
    if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) element.play().catch(() => {});
        else element.pause();
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <figure className="flex max-w-3xl flex-col gap-2" data-setup-clip>
      <video
        ref={video}
        src={SRC}
        poster={POSTER}
        width={1536}
        height={960}
        muted
        loop
        playsInline
        controls
        preload="none"
        aria-describedby="setup-clip-caption"
        className="h-auto w-full rounded-xl border bg-muted"
      />
      <figcaption id="setup-clip-caption" className="text-sm text-muted-foreground">
        In Claude Code: install the plugin with one command, sign in once on GitRanks, then ask for an open-source issue
        and get your picks.
      </figcaption>
    </figure>
  );
}
