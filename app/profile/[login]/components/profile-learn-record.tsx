'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { type FC, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { isProfileOwner } from '@/lib/contribute/profile-issues';
import type { LearnRecord } from '@/lib/learn/learn.types';
import { MY_LESSONS_PATH } from '@/lib/learn/learn-path';
import { recordTopicsOf } from '@/lib/learn/learn-promo';
import { readLearnRecord } from '@/lib/learn/learn-promo-read';
import { loginFromPath } from '@/utils/login-from-path';

const n = (value: number) => value.toLocaleString('en-US');

/** The record's numbers, each with its label in the singular for one. */
const statsOf = (record: LearnRecord) => [
  { value: record.lessons, label: record.lessons === 1 ? 'lesson done' : 'lessons done' },
  { value: record.topics.length, label: record.topics.length === 1 ? 'topic learned' : 'topics learned' },
  {
    value: record.prsOpened,
    label: record.prsOpened === 1 ? 'pull request opened' : 'pull requests opened',
  },
  { value: record.prsMerged, label: 'merged' },
];

/**
 * A developer's GitRanks Learn record, the same for everyone who reads the profile: lessons passed and shared, the
 * topics they covered, and the pull requests that came of them. `own`: the owner reads it, with the way to their
 * lessons. Nothing without a record.
 */
export const LearnRecordCard: FC<{ record: LearnRecord | null; own?: boolean }> = ({ record, own }) => {
  if (!record) return null;
  const { shown, more } = recordTopicsOf(record.topics);
  return (
    <section
      aria-labelledby="profile-learn-record"
      data-learn-record=""
      className="flex flex-col gap-4 rounded-xl border bg-card p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="profile-learn-record" className="text-xl font-semibold tracking-tight">
          Learned on real issues
        </h2>
        {own ? (
          <Link href={MY_LESSONS_PATH} prefetch={false} className="text-sm font-semibold text-link hover:underline">
            All lessons →
          </Link>
        ) : null}
      </div>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statsOf(record).map(({ value, label }) => (
          <div key={label} className="flex flex-col-reverse justify-end gap-0.5">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-mono text-2xl font-bold tabular-nums">{n(value)}</dd>
          </div>
        ))}
      </dl>
      {shown.length ? (
        <ul aria-label="Topics learned" className="flex flex-wrap gap-1.5 border-t pt-3">
          {shown.map((topic) => (
            <li key={topic}>
              <Badge variant="outline">{topic}</Badge>
            </li>
          ))}
          {more ? (
            <li>
              <Badge variant="outline">+{n(more)} more</Badge>
            </li>
          ) : null}
        </ul>
      ) : null}
    </section>
  );
};

/**
 * The Learn record on a profile, read in the browser after the cached page loads, so a pass shows within a minute.
 * Nothing before the answer, without a public pass, or on any failure.
 */
export function ProfileLearnRecord({ login }: { login: string }) {
  const { data: session } = useSession();
  const viewer = session && !session.error ? session.user?.githubLogin : undefined;
  const profile = loginFromPath(login);
  const [record, setRecord] = useState<LearnRecord | null>(null);

  useEffect(() => {
    setRecord(null);
    let live = true;
    readLearnRecord(profile).then((got) => {
      if (live) setRecord(got);
    });
    return () => {
      live = false;
    };
  }, [profile]);

  return <LearnRecordCard record={record} own={isProfileOwner(viewer, profile)} />;
}
