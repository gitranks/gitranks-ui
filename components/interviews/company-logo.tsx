'use client';

import { type CSSProperties, useEffect, useRef, useState } from 'react';

import {
  COMPANY_LOGO_LOOK,
  type CompanyLogoSize,
  companyLetterOf,
  companyLogoSrcOf,
} from '@/lib/interviews/company-logo';
import type { InterviewCompanyRef } from '@/lib/interviews/types';
import { cn } from '@/lib/utils';

/**
 * A company's logo before its name: its picture on a white square with a thin border, in both themes; with no logo,
 * its first letter in the same square. A file that does not load (taken down since, or a failed read) draws the
 * letter too, never an empty square. It only marks the name beside it, so screen readers skip it.
 */
export function CompanyLogo({
  company,
  size,
  className,
}: Readonly<{ company: InterviewCompanyRef; size: CompanyLogoSize; className?: string }>) {
  const { radius, letter } = COMPANY_LOGO_LOOK[size];
  const square: CSSProperties = { width: size, height: size, borderRadius: radius };
  const src = companyLogoSrcOf(company, size);
  const [failed, setFailed] = useState(false);
  const picture = useRef<HTMLImageElement>(null);

  // A file that failed before the page came alive fired its error with no one listening: read it once on mount.
  useEffect(() => {
    const image = picture.current;
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, []);

  if (src && !failed) {
    return (
      <img
        ref={picture}
        src={src}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        decoding="async"
        data-company-logo={company.slug}
        onError={() => setFailed(true)}
        style={square}
        className={cn('inline-block shrink-0 bg-white object-cover align-middle ring-1 ring-border', className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      data-company-logo={company.slug}
      data-company-letter=""
      style={{ ...square, fontSize: letter }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center bg-muted align-middle font-semibold leading-none text-muted-foreground ring-1 ring-border',
        className,
      )}
    >
      {companyLetterOf(company.name)}
    </span>
  );
}
