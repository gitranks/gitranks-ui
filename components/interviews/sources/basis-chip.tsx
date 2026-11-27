import { Check } from 'lucide-react';

import { basisWordsOf, statedByCompany } from '@/lib/interviews/sources';
import type { InterviewBasis } from '@/lib/interviews/types';

/**
 * Who states a fact, as a small chip beside it: "Northwind states" and "Northwind and candidates" filled, with a tick;
 * "Candidates report" quiet, with a border and no tick.
 */
export function BasisChip({ basis, company }: Readonly<{ basis: InterviewBasis; company: string }>) {
  if (statedByCompany(basis)) {
    return (
      <span
        data-basis={basis}
        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
      >
        <Check aria-hidden="true" className="size-4 shrink-0" />
        {basisWordsOf(basis, company)}
      </span>
    );
  }
  return (
    <span
      data-basis={basis}
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground"
    >
      {basisWordsOf(basis, company)}
    </span>
  );
}
