'use client';

import { Check, ExternalLink, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

import { CourseMark } from './course-marks';
import { GoFurtherDoor } from '@/components/build/doors-gate';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/workspace/kbd';
import {
  type CourseBoxes,
  type CourseFirstBox,
  type CourseLastBox,
  type CourseMiddleBox,
  countWords,
  lessonsWords,
  reviewMinutesWords,
  toRepeatWords,
} from '@/lib/learn/course';
import { companyPlansButtonOf } from '@/lib/learn/course-interviews';
import {
  checkPath,
  courseHrefOf,
  LEARN_REVIEW_PATH,
  learnCourseRealWorldPath,
  learnKnownPath,
  learnLessonPath,
} from '@/lib/learn/paths';
import { courseIssuesBoxWordsOf } from '@/lib/learn/real-issues';
import { cn } from '@/lib/utils';

/*
 * The three boxes at the top of a course's page, each in a place of its own size: where to start or go on,
 * the check or the review, and how a lesson grows or where to go next. The highlighted box takes Enter.
 */

/** What the boxes call: signing in, and rating the course once it is finished. */
export type CourseBoxCalls = { onSignIn: () => void; onRate?: (good: boolean) => Promise<boolean> };

function Box({ lit, children }: { lit: boolean; children: ReactNode }) {
  return (
    <section
      className={cn('flex min-w-0 flex-col gap-3 rounded-xl bg-card p-5', lit ? 'border-2 border-primary' : 'border')}
      data-lit={lit ? '' : undefined}
    >
      {children}
    </section>
  );
}

const Eyebrow = ({ children }: { children: ReactNode }) => (
  <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{children}</span>
);
const Title = ({ children }: { children: ReactNode }) => (
  <h2 className="m-0 text-lg font-semibold text-balance">{children}</h2>
);
const Text = ({ children }: { children: ReactNode }) => <p className="m-0 text-sm text-muted-foreground">{children}</p>;

/** A box's one action: the main one (it takes Enter) when its box is highlighted, else an outline one. */
function Action({
  lit,
  hints,
  href,
  onClick,
  keyHint,
  children,
}: {
  lit: boolean;
  hints: boolean;
  href?: string;
  onClick?: () => void;
  /** The key of an action that is not the main one, as "R" for the review. */
  keyHint?: string;
  children: ReactNode;
}) {
  const kbd = hints ? lit ? <Kbd onPrimary>⏎</Kbd> : keyHint ? <Kbd>{keyHint}</Kbd> : null : null;
  const className = cn('mt-auto self-start', lit ? 'h-10 px-6 font-semibold' : 'h-9 px-4');
  const props = { 'data-course-enter': lit ? '' : undefined, 'data-course-key': keyHint };
  return href ? (
    <Button asChild variant={lit ? 'default' : 'outline'} className={className}>
      <Link href={href as never} {...props}>
        {children}
        {kbd}
      </Link>
    </Button>
  ) : (
    <Button type="button" variant={lit ? 'default' : 'outline'} className={className} onClick={onClick} {...props}>
      {children}
      {kbd}
    </Button>
  );
}

function FirstBox({
  box,
  lit,
  hints,
  onRate,
}: { box: CourseFirstBox; lit: boolean; hints: boolean } & Pick<CourseBoxCalls, 'onRate'>) {
  switch (box.kind) {
    case 'start':
      return (
        <Box lit={lit}>
          <Eyebrow>Start here</Eyebrow>
          <Title>{box.lesson.title}</Title>
          <Text>The first lesson of this course. You can read it and answer its question.</Text>
          <Action lit={lit} hints={hints} href={learnLessonPath(box.lesson.slug)}>
            Open the lesson
          </Action>
        </Box>
      );
    case 'next':
      return (
        <Box lit={lit}>
          {box.finishedGroup ? (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-positive">
              <Check className="size-4" aria-hidden="true" />
              You finished {box.finishedGroup}
            </span>
          ) : null}
          <Eyebrow>Next for you</Eyebrow>
          <Title>{box.lesson.title}</Title>
          <Text>
            {box.group ? `${box.group} · ` : null}
            {box.why}
          </Text>
          <Action lit={lit} hints={hints} href={learnLessonPath(box.lesson.slug)}>
            Start lesson
          </Action>
        </Box>
      );
    case 'finished':
      return (
        <Box lit={lit}>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-positive">
            <Check className="size-4" aria-hidden="true" />
            You finished this course
          </span>
          {/* The learner's own count, as the line under the title says it: a paused lesson not learned is not in it. */}
          <Title>
            {countWords(box.learned)} of {lessonsWords(box.lessons)} learned
          </Title>
          {box.pausedLeft > 0 ? (
            <Text>
              {box.pausedLeft === 1
                ? 'The one lesson left is paused while we correct it.'
                : `The ${countWords(box.pausedLeft)} lessons left are paused while we correct them.`}
            </Text>
          ) : null}
          {onRate ? <RateCourse onRate={onRate} initial={box.rated} /> : null}
        </Box>
      );
    case 'known-left':
      return (
        <Box lit={lit}>
          <Eyebrow>Nothing new left</Eyebrow>
          <Title>{box.lesson.title}</Title>
          <Text>
            Every lesson you have not learned is marked as known. Learn this one by answering its question, so it comes
            back in your review.
          </Text>
          <Action lit={lit} hints={hints} href={learnLessonPath(box.lesson.slug)}>
            Learn it
          </Action>
        </Box>
      );
    case 'paused-left':
      return (
        <Box lit={false}>
          <Eyebrow>Nothing new left</Eyebrow>
          <Title>
            {box.paused === 1 ? 'The lesson left is paused' : `The ${countWords(box.paused)} lessons left are paused`}
          </Title>
          <Text>We are correcting a mistake. They come back here once it is fixed, and your progress is kept.</Text>
        </Box>
      );
  }
}

/** "How was this course?": Good or Not good, once it is finished. */
function RateCourse({
  onRate,
  initial = null,
}: {
  onRate: (good: boolean) => Promise<boolean>;
  initial?: boolean | null;
}) {
  const [good, setGood] = useState<boolean | null>(initial);
  const rate = (value: boolean) => {
    const before = good;
    setGood(value);
    onRate(value)
      .then((saved) => {
        if (!saved) setGood(before);
      })
      .catch(() => setGood(before));
  };
  const button = (value: boolean, label: string, icon: ReactNode) => (
    <Button
      type="button"
      variant="outline"
      aria-pressed={good === value}
      className={cn('h-8 gap-1.5 px-2.5 text-[13px]', good === value ? 'text-foreground' : 'text-muted-foreground')}
      onClick={() => rate(value)}
    >
      {icon}
      {label}
    </Button>
  );
  return (
    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <span className="text-sm text-muted-foreground">How was this course?</span>
      <fieldset className="m-0 inline-flex min-w-0 items-center gap-2 border-0 p-0">
        <legend className="sr-only">Rate this course</legend>
        {button(true, 'Good', <ThumbsUp className="size-3.5" aria-hidden="true" />)}
        {button(false, 'Not good', <ThumbsDown className="size-3.5" aria-hidden="true" />)}
      </fieldset>
    </div>
  );
}

function MiddleBox({
  box,
  lit,
  hints,
  slug,
  onSignIn,
}: {
  box: CourseMiddleBox;
  lit: boolean;
  hints: boolean;
  slug: string;
  onSignIn: () => void;
}) {
  const check = checkPath(slug);
  switch (box.kind) {
    case 'check-sign-in':
      return (
        <Box lit={lit}>
          <Eyebrow>Already know some of this?</Eyebrow>
          <Title>Take the 2-minute check</Title>
          <Text>
            One question for each group of lessons. We mark what you already know, and you start further in. It needs an
            account, so the result can be saved.
          </Text>
          <Action lit={lit} hints={hints} onClick={onSignIn}>
            Sign in to take the check
          </Action>
        </Box>
      );
    case 'check':
      return (
        <Box lit={lit}>
          <Eyebrow>Already know some of this?</Eyebrow>
          <Title>Take the 2-minute check</Title>
          <Text>One question for each group of lessons. We mark what you already know, and you start further in.</Text>
          <Action lit={lit} hints={hints} href={check}>
            Take the check
          </Action>
        </Box>
      );
    case 'check-unfinished':
      return (
        <Box lit={lit}>
          <Eyebrow>Your check</Eyebrow>
          <Title>Finish the check</Title>
          <Text>
            {box.left === 1 ? 'One question left.' : `${countWords(box.left)} questions left.`} The answers you gave are
            kept.
          </Text>
          <Action lit={lit} hints={hints} href={check}>
            Finish the check
          </Action>
        </Box>
      );
    case 'check-ended':
      return (
        <Box lit={lit}>
          <Eyebrow>Your check</Eyebrow>
          <Title>See what you know</Title>
          <Text>Every question is answered. Save the lessons you know, and you start further in.</Text>
          <Action lit={lit} hints={hints} href={check}>
            See the result
          </Action>
        </Box>
      );
    case 'known':
      return (
        <Box lit={lit}>
          <Eyebrow>What you know</Eyebrow>
          <Title>
            {countWords(box.known)} {box.known === 1 ? 'lesson' : 'lessons'} marked as known
          </Title>
          <Text>
            You said you know them without answering. They stay out of your review, and you can change this at any time.
          </Text>
          <Action lit={lit} hints={hints} href={learnKnownPath(slug)}>
            Change what you know
          </Action>
        </Box>
      );
    case 'due':
      return (
        <Box lit={lit}>
          <Eyebrow>Due now</Eyebrow>
          <Title>{toRepeatWords(box.due)}</Title>
          <Text>{reviewMinutesWords(box.due)} Getting one right again moves it from Learned to Practised.</Text>
          <Action lit={lit} hints={hints} href={LEARN_REVIEW_PATH} keyHint="R">
            Review now
          </Action>
        </Box>
      );
    case 'review-none':
      return (
        <Box lit={lit}>
          <Eyebrow>The review</Eyebrow>
          <Title>Nothing to repeat now</Title>
          <Text>A lesson you learn comes back three days later, so it stays.</Text>
        </Box>
      );
    case 'grows':
      return <GrowsBox />;
    case 'plans':
      return (
        <Box lit={false}>
          <Eyebrow>Preparing for {box.company}?</Eyebrow>
          <Title>Follow an interview plan</Title>
          <Text>
            A plan puts these lessons, and lessons from other courses, in the order of the rounds for your position and
            level.
          </Text>
          <Action lit={false} hints={hints} href={box.href}>
            {companyPlansButtonOf(box.company, box.plans)}
          </Action>
        </Box>
      );
  }
}

/** How a lesson grows: the three depths. */
function GrowsBox() {
  const row = (kind: 'learned' | 'practised' | 'mastered', name: string, text: string) => (
    <li className="flex items-center gap-2">
      <CourseMark square={{ kind, due: false }} />
      <span>
        <b className="font-semibold">{name}</b>: {text}
      </span>
    </li>
  );
  return (
    <Box lit={false}>
      <Eyebrow>How a lesson grows</Eyebrow>
      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
        {row('learned', 'Learned', 'you passed the lesson.')}
        {row('practised', 'Practised', 'you got it right again, days later.')}
        {row('mastered', 'Mastered', 'you got it right once more, ten days after that.')}
      </ul>
    </Box>
  );
}

function LastBox({
  box,
  lit,
  hints,
  slug,
  issuesHref,
  onSignIn,
}: {
  box: CourseLastBox;
  lit: boolean;
  hints: boolean;
  /** The course's slug: "Go further" names Build's project of the course, for a person Build is open to. */
  slug: string;
  /** Where "Fix a real issue" leads. */
  issuesHref: Route;
  onSignIn: () => void;
}) {
  switch (box.kind) {
    case 'issues': {
      const words = courseIssuesBoxWordsOf(box.count);
      return (
        <Box lit={lit}>
          <Eyebrow>Fix a real issue</Eyebrow>
          <Title>{words.title}</Title>
          <Text>{words.text}</Text>
          <Action lit={lit} hints={hints} href={issuesHref}>
            {words.button}
          </Action>
        </Box>
      );
    }
    case 'grows':
      return <GrowsBox />;
    case 'sign-in':
      return (
        <Box lit={lit}>
          <Eyebrow>Save your progress</Eyebrow>
          <Title>Sign in with GitHub</Title>
          <Text>
            Your lessons are saved, we repeat them with you so they stay, and they build a Skills page you can show.
          </Text>
          <Action lit={lit} hints={hints} onClick={onSignIn}>
            Sign in with GitHub
          </Action>
        </Box>
      );
    case 'further':
      return (
        <Box lit={lit}>
          <Eyebrow>Go further</Eyebrow>
          <GoFurtherDoor
            course={slug}
            parts={{
              next: box.next ? { name: box.next.name, href: courseHrefOf(box.next), lessons: box.next.lessons } : null,
              issues: box.issues ? { open: box.issues, href: issuesHref } : null,
            }}
            today={
              <ul className="m-0 flex list-none flex-col gap-3 p-0 text-sm">
                {box.next ? (
                  <li className="flex flex-col">
                    <Link href={courseHrefOf(box.next)} className="font-semibold text-link hover:underline">
                      Next course: {box.next.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">{lessonsWords(box.next.lessons)}</span>
                  </li>
                ) : null}
                {box.issues ? (
                  <li className="flex flex-col" data-further-issues="">
                    <Link href={issuesHref} className="font-semibold text-link hover:underline">
                      Fix a real issue
                    </Link>
                    <span className="text-xs text-muted-foreground">{courseIssuesBoxWordsOf(box.issues).title}.</span>
                  </li>
                ) : null}
                <li className="flex flex-col">
                  <a
                    href="https://roleford.com"
                    rel="noreferrer"
                    target="_blank"
                    className="inline-flex items-center gap-1 font-semibold text-link hover:underline"
                  >
                    Looking for a job?
                    <ExternalLink className="size-[13px]" aria-hidden="true" />
                  </a>
                  <span className="text-xs text-muted-foreground">Roleford finds roles that match what you know.</span>
                </li>
              </ul>
            }
          />
        </Box>
      );
  }
}

/** The three boxes, side by side; one above the other on a phone. */
export function CourseBoxesRow({
  boxes,
  slug,
  hints,
  calls,
  issuesHref,
}: {
  boxes: CourseBoxes;
  slug: string;
  hints: boolean;
  calls: CourseBoxCalls;
  /** Where "Fix a real issue" leads: the course's own view of Issues, or the Issues of a project course's project. */
  issuesHref?: Route;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3" data-course-boxes="">
      <FirstBox box={boxes.first} lit={boxes.highlight === 'first'} hints={hints} onRate={calls.onRate} />
      <MiddleBox
        box={boxes.middle}
        lit={boxes.highlight === 'middle'}
        hints={hints}
        slug={slug}
        onSignIn={calls.onSignIn}
      />
      <LastBox
        box={boxes.last}
        lit={boxes.highlight === 'last'}
        hints={hints}
        slug={slug}
        issuesHref={issuesHref ?? learnCourseRealWorldPath(slug)}
        onSignIn={calls.onSignIn}
      />
    </div>
  );
}
