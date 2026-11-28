'use client';

import type { Route } from 'next';
import Link from 'next/link';

import { useBuildDoors } from './doors-live';
import { issueBuildLineOf } from '@/lib/build/doors';
import type { BuildDoors } from '@/lib/build/types';

const LINK = 'font-medium text-foreground hover:underline';

/**
 * The last thing on an issue's page with a lesson, in small grey words, for a signed-in person who feels not
 * ready: learn the lesson (when it is new to them), or build a project of the lesson's course with their agent first.
 * No line when there is neither, and none for anyone else. The agent that fixes the issue is never told about it.
 * `drawn`: the doors as the catalogue draws them, read from nowhere.
 */
export function IssueBuildLine({
  lesson,
  drawn,
}: {
  lesson: { slug: string; title: string; href?: Route | null; learned: boolean };
  drawn?: BuildDoors;
}) {
  const read = useBuildDoors(drawn ? null : { lesson: lesson.slug });
  const line = issueBuildLineOf(lesson, drawn ?? read);
  if (!line) return null;
  const learn =
    line.kind !== 'project' ? (
      <Link href={line.lesson.href} prefetch={false} className={LINK}>
        “{line.lesson.title}”
      </Link>
    ) : null;
  const project =
    line.kind !== 'lesson' ? (
      <Link href={line.project.href} prefetch={false} className={LINK}>
        {line.project.thing}
      </Link>
    ) : null;
  return (
    <p className="m-0 px-1 text-sm text-muted-foreground" data-issue-build-line={line.kind}>
      {line.kind === 'both' ? (
        <>
          New to this? Learn {learn}, or build {project} with your agent first.
        </>
      ) : line.kind === 'project' ? (
        <>Want more practice first? Build {project} with your agent. It uses the same idea.</>
      ) : (
        <>New to this? Learn {learn} first.</>
      )}
    </p>
  );
}
