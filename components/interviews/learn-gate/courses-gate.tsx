'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { COURSES_INTERVIEWS_MINE_PATH, coursesInterviewsFrom } from './courses-interviews';
import { CompanyLogo } from '@/components/interviews/company-logo';
import { readInterviewsKeyWithin } from '@/components/interviews/interviews-read';
import { interviewsOpenForDocument } from '@/components/interviews/interviews-viewer';
import { INTERVIEWS_HOME_PATH, interviewCompanyPath } from '@/lib/interviews/paths';
import type { CourseCompanyUse, CoursesCompany, CoursesInterviews } from '@/lib/learn/courses-interviews';
import { cn } from '@/lib/utils';

/*
 * Interviews on the list of all courses, as Learn's list imports it: the row of companies under the search, a company's
 * logo before a course of the section, and the line of a course a typed company's plans use. The list is cached and the
 * same for everyone: while Interviews is not open to everyone, the server draws today's list and a person Interviews is
 * open to gets these parts once their browser knows it.
 */

/** What Interviews' list of all courses shows, as this browser knows it: `served` once open to everyone, else read. */
export function useCoursesInterviews(served: CoursesInterviews | null): CoursesInterviews | null {
  const [read, setRead] = useState<CoursesInterviews | null>(null);
  useEffect(() => {
    if (served) return;
    let live = true;
    void interviewsOpenForDocument().then(async (open) => {
      if (!open || !live) return;
      const answer = coursesInterviewsFrom(await readInterviewsKeyWithin(COURSES_INTERVIEWS_MINE_PATH, 'interviews'));
      if (live) setRead(answer);
    });
    return () => {
      live = false;
    };
  }, [served]);
  return served ?? read;
}

/** A company's tag: its logo and its name, blue, in both themes, as Interviews' search draws a company. */
const COMPANY_TAG =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full py-0.5 pr-2 pl-1 text-xs font-semibold bg-[oklch(0.95_0.03_250)] text-[oklch(0.42_0.12_250)] dark:bg-[oklch(0.32_0.07_250)] dark:text-[oklch(0.9_0.05_250)]';

/** A company's tag, with its logo. */
function CompanyTag({ company }: Readonly<{ company: CoursesCompany }>) {
  return (
    <span className={COMPANY_TAG} data-company-tag={company.slug}>
      <CompanyLogo company={company} size={16} />
      <span>{company.name}</span>
    </span>
  );
}

/**
 * The row under the search, the same in every state: "Preparing for an interview?", the top five companies, each a
 * link to its page in Interviews, and "All companies". On a phone it is one line that moves sideways. None with no
 * company.
 */
export function CoursesCompaniesRow({ top }: Readonly<{ top: readonly CoursesCompany[] }>) {
  if (!top.length) return null;
  return (
    <div
      className="flex items-center gap-2 text-sm max-sm:overflow-x-auto max-sm:whitespace-nowrap max-sm:[scrollbar-width:none] sm:flex-wrap"
      data-courses-companies=""
    >
      <span className="mr-0.5 whitespace-nowrap text-muted-foreground">Preparing for an interview?</span>
      {top.map((company) => (
        <Link
          key={company.slug}
          href={interviewCompanyPath(company.slug)}
          className="inline-flex shrink-0 rounded-full"
        >
          <CompanyTag company={company} />
        </Link>
      ))}
      <Link
        href={INTERVIEWS_HOME_PATH}
        className="ml-1 shrink-0 whitespace-nowrap text-sm font-medium text-link hover:underline"
      >
        All companies
      </Link>
    </div>
  );
}

/** The logo before the name of a company's course in the section Interviews. */
export function CourseCompanyLogo({ company }: Readonly<{ company: CoursesCompany }>) {
  return <CompanyLogo company={company} size={20} />;
}

/** Under a course a typed company's plans use: the company's tag and why the course is there, one line a company. */
export function CourseCompanyUses({
  uses,
  className,
}: Readonly<{ uses: readonly CourseCompanyUse[]; className?: string }>) {
  return (
    <span className={cn('flex flex-col gap-1', className)} data-course-uses="">
      {uses.map(({ company, line }) => (
        <span key={company.slug} className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <CompanyTag company={company} />
          {line ? <span className="text-xs text-muted-foreground">{line}</span> : null}
        </span>
      ))}
    </span>
  );
}
