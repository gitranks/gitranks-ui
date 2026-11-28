'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';

import { useBuildDoors } from './doors-live';
import { courseLineOf, placeWordsOf } from '@/lib/build/doors';
import type { BuildDoors } from '@/lib/build/types';

const LINK = 'font-medium text-link hover:underline';

/**
 * The line under a course's numbers, for a signed-in person: "Build it yourself:" and the things the course's
 * projects build, three at the most and then how many more, each with the person's place (a tick once built, the
 * step of a build in progress). No line when no project names the course, and none for anyone else. `drawn`: the
 * doors as the catalogue draws them, read from nowhere.
 */
export function CourseBuildLine({ course, drawn }: { course: string; drawn?: BuildDoors }) {
  const read = useBuildDoors(drawn ? null : { course });
  const line = courseLineOf(drawn ?? read);
  if (!line) return null;
  return (
    <p className="m-0 text-sm text-muted-foreground" data-course-build-line="">
      Build it yourself:{' '}
      {line.items.map((item, index) => (
        <Fragment key={item.slug}>
          {index > 0 ? ', ' : null}
          <Link href={item.href} prefetch={false} className={LINK}>
            {item.thing}
          </Link>
          {item.place?.kind === 'built' ? (
            <>
              {' '}
              <Check aria-label="built" className="inline size-4 align-[-0.15em] text-positive" />
            </>
          ) : null}
          {placeWordsOf(item.place) ? <span className="text-muted-foreground">{placeWordsOf(item.place)}</span> : null}
        </Fragment>
      ))}
      {line.more > 0 ? (
        <>
          {' and '}
          <Link href={line.moreHref} prefetch={false} className={LINK}>
            {line.more} more
          </Link>
        </>
      ) : null}
    </p>
  );
}
