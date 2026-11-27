'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { CompanyLogo } from '@/components/interviews/company-logo';
import { readInterviewsKeyWithin } from '@/components/interviews/interviews-read';
import { interviewsOpenForDocument } from '@/components/interviews/interviews-viewer';
import {
  askedAtHrefOf,
  askedAtOf,
  COMPANIES_NAMED,
  courseInterviewsOf,
  namedCompaniesOf,
  topicSentenceOf,
} from '@/lib/interviews/learn-course';
import { interviewCompanyPath, interviewsForCourseMinePath } from '@/lib/interviews/paths';
import type { InterviewsForCourse } from '@/lib/interviews/types';
import type { CourseInterviews, CourseInterviewsGroup } from '@/lib/learn/course-interviews';
import type { CoursesCompany } from '@/lib/learn/courses-interviews';

/*
 * Interviews on a course's page and on its lessons, as Learn's pages import it: the line of the companies whose plans
 * use the course, "Asked at" on a group's line, a company's logo before its own course's name, and a lesson's sentence
 * about its group's topic. Those pages are cached and the same for everyone: while Interviews is not open to everyone,
 * the server draws today's page, and a person Interviews is open to gets these parts once their browser knows it.
 */

/** What the API answers for one course, as a page serves it once Interviews is open to everyone. */
export type ServedCourseInterviews = InterviewsForCourse | null;

/**
 * What a course's pages show of Interviews, as this browser knows it: the served answer once Interviews is open to
 * everyone (`served` given), else read from the person's route once their browser knows Interviews is open to them.
 * Null until then, for anyone it is closed to, and when the course has nothing of Interviews.
 */
export function useCourseInterviews(course: string, served?: ServedCourseInterviews): CourseInterviews | null {
  const [read, setRead] = useState<{ course: string; interviews: CourseInterviews | null } | null>(null);
  const serving = served !== undefined;
  useEffect(() => {
    if (serving) return;
    let live = true;
    void interviewsOpenForDocument().then(async (open) => {
      if (!open || !live) return;
      const answer = await readInterviewsKeyWithin(interviewsForCourseMinePath(course), 'course');
      if (live) setRead({ course, interviews: courseInterviewsOf(answer as InterviewsForCourse | null) });
    });
    return () => {
      live = false;
    };
  }, [course, serving]);
  const fromServer = useMemo(() => (serving ? courseInterviewsOf(served) : null), [serving, served]);
  if (serving) return fromServer;
  return read?.course === course ? read.interviews : null;
}

/** A company named in a sentence: its logo and its name, a link to its page in Interviews, never parted. */
function CompanyLink({ company }: Readonly<{ company: CoursesCompany }>) {
  return (
    <Link
      href={interviewCompanyPath(company.slug)}
      className="font-medium whitespace-nowrap text-foreground hover:underline"
      data-company-link={company.slug}
    >
      <CompanyLogo company={company} size={16} />
      <span className="ml-1">{company.name}</span>
    </Link>
  );
}

/**
 * The companies of a sentence: three by name, then "N more", which names the rest in place (the keyboard goes on from
 * the first company it named). "A", "A and B", "A, B and C", "A, B, C and 4 more".
 */
export function CompanyNames({ companies }: Readonly<{ companies: readonly CoursesCompany[] }>) {
  const [all, setAll] = useState(false);
  const host = useRef<HTMLSpanElement>(null);
  const opened = useRef(false);
  const { named, more } = namedCompaniesOf(companies, all);
  useEffect(() => {
    if (!all || !opened.current) return;
    opened.current = false;
    host.current?.querySelectorAll<HTMLElement>('[data-company-link]')[COMPANIES_NAMED]?.focus();
  }, [all]);
  // The name before which " and " stands: the last one, or "N more" after the three.
  const last = more > 0 ? named.length : named.length - 1;
  return (
    <span ref={host} data-company-names="">
      {named.map((company, index) => (
        <span key={company.slug}>
          {index === 0 ? null : index === last ? ' and ' : ', '}
          <CompanyLink company={company} />
        </span>
      ))}
      {more > 0 ? (
        <>
          {' and '}
          <button
            type="button"
            className="font-medium whitespace-nowrap text-foreground hover:underline"
            data-company-more=""
            onClick={() => {
              opened.current = true;
              setAll(true);
            }}
          >
            {more} more
          </button>
        </>
      ) : null}
    </span>
  );
}

/** Under a course's row of facts: "In the interview plans of A, B, C and 7 more." None with no company. */
export function CoursePlansLine({ companies }: Readonly<{ companies: readonly CoursesCompany[] }>) {
  if (!companies.length) return null;
  return (
    <p className="m-0 text-sm leading-[1.7] text-muted-foreground" data-course-plans="">
      In the interview plans of <CompanyNames companies={companies} />.
    </p>
  );
}

/**
 * "Asked at" on a group's line: up to three logos and how many more; the names show on pointing and are read by
 * screen readers. It leads to the company's page, or to Interviews home when several ask it.
 */
export function GroupAskedAt({ entry }: Readonly<{ entry: CourseInterviewsGroup }>) {
  const asked = askedAtOf(entry);
  if (!asked) return null;
  return (
    <>
      <Link
        href={askedAtHrefOf(entry.companies)}
        className="inline-flex items-center gap-1.5 hover:underline"
        title={asked.title}
        data-asked-at={entry.group}
      >
        <span>Asked at</span>
        <span className="inline-flex items-center gap-1">
          {asked.logos.map((company) => (
            <CompanyLogo key={company.slug} company={company} size={16} />
          ))}
        </span>
        {asked.more ? (
          <span className="text-xs" aria-hidden="true">
            {asked.more}
          </span>
        ) : null}
        <span className="sr-only">{asked.names}</span>
      </Link>
      <span aria-hidden="true">·</span>
    </>
  );
}

/** A company's logo before the name of its own course, as a page's title draws it. */
export function CourseTitleLogo({ company }: Readonly<{ company: CoursesCompany }>) {
  return <CompanyLogo company={company} size={40} />;
}

/**
 * At the end of a lesson's text, about its group's topic: "Candidates report graphs in interviews at A and B.", or
 * "A and B list graphs among their interview topics." when every company states it on its own pages. Nothing where
 * there is nothing to say. The same before and after the answer, and inside a plan.
 */
export function LessonInterviewsNote({
  course,
  group,
  served,
}: Readonly<{ course: string; group: string; served?: ServedCourseInterviews }>) {
  const interviews = useCourseInterviews(course, served);
  const entry = interviews?.groups.find((each) => each.group === group && each.companies.length > 0) ?? null;
  const sentence = entry ? topicSentenceOf(entry) : null;
  if (!entry || !sentence) return null;
  return (
    <p className="m-0 max-w-[62ch] text-sm leading-[1.7] text-muted-foreground" data-lesson-interviews="">
      {sentence.before}
      <CompanyNames companies={entry.companies} />
      {sentence.after}
    </p>
  );
}
