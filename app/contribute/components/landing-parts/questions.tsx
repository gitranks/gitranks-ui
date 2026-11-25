import Link from 'next/link';

import { H2, WIDTH } from '@/components/workspace/getting-in/landing-parts';
import { PHONE_LINK } from '@/components/workspace/phone-link';
import { LANDING_QUESTIONS } from '@/lib/contribute/faq';
import { cn } from '@/lib/utils';
import { FAQ_PATH } from '@/lib/workspace/paths';

const LINK = cn('font-semibold text-link hover:underline', PHONE_LINK);

/** The landing's own questions, each with its link when it has one, and the way to all of them. */
export function LandingQuestions() {
  return (
    <section className={cn(WIDTH, 'flex flex-wrap gap-12 py-11 sm:py-16')} data-landing="questions">
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5">
        <h2 className={H2}>Questions</h2>
        <p className="m-0 text-muted-foreground">
          Still unsure which way fits you? Start with either. You can add the other later on the Agent tab.
        </p>
        <Link href={FAQ_PATH} prefetch={false} className={cn('self-start', LINK)}>
          All questions →
        </Link>
      </div>
      <dl className="m-0 flex min-w-0 flex-[2_1_560px] flex-col gap-5.5">
        {LANDING_QUESTIONS.map(({ question, answer, more }) => (
          <div key={question} className="flex flex-col gap-1">
            <dt className="font-bold">{question}</dt>
            <dd className="m-0 text-foreground/80">
              {answer}
              {more ? (
                <>
                  {' '}
                  <Link href={more.href} prefetch={false} className={LINK}>
                    {more.label} →
                  </Link>
                </>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
