'use client';

import { useEffect, useState } from 'react';

import { readInterviewsKeyWithin } from '../interviews-read';
import { CompanyView } from './company-view';
import { myPlansAtOf } from '@/lib/interviews/company';
import { INTERVIEWS_MY_HOME_MINE_PATH } from '@/lib/interviews/paths';
import type { InterviewCompanyPage, InterviewPlanRow } from '@/lib/interviews/types';
import { hasSessionHint } from '@/lib/session-hint';

/**
 * A company's page as it lives in the browser. The page is the same for everyone; once it is up, a person with a
 * session reads their plans in progress (`/api/me/interviews/home`), and those at this company put the box on top and
 * the mark on their rows. A visitor asks for nothing. While a browser with a session reads, the sections under the
 * title stay hidden in their place, and show by themselves after the read's time limit. A read that fails draws the
 * page as for a visitor.
 */
export function CompanyLive({ page }: Readonly<{ page: InterviewCompanyPage }>) {
  const [mine, setMine] = useState<InterviewPlanRow[]>([]);
  const [reading, setReading] = useState(true);
  const company = page.company.slug;

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setMine([]);
      setReading(false);
      return;
    }
    let live = true;
    setReading(true);
    void readInterviewsKeyWithin(INTERVIEWS_MY_HOME_MINE_PATH, 'home').then((home) => {
      if (!live) return;
      setMine(myPlansAtOf(home, company));
      setReading(false);
    });
    return () => {
      live = false;
    };
  }, [company]);

  return <CompanyView page={page} mine={mine} reading={reading} />;
}
