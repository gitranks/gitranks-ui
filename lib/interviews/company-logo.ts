import { type InterviewLogoSize, interviewLogoPath } from './paths';
import type { InterviewCompanyRef } from './types';

/*
 * A company's logo, as every page draws it before the company's name: 16 px on a chip, 20 px in a row, a suggestion
 * or a course's name, 28 px on a card, 40 px in a page's title. With no logo, the company's first letter in the same
 * square.
 */

/** The four sizes a logo is drawn at, in px. */
export const COMPANY_LOGO_SIZES = [16, 20, 28, 40] as const;
export type CompanyLogoSize = (typeof COMPANY_LOGO_SIZES)[number];

/** How each size is drawn: the square's corner radius and the letter's size, in px. */
export const COMPANY_LOGO_LOOK: Record<CompanyLogoSize, { radius: number; letter: number }> = {
  16: { radius: 3, letter: 9 },
  20: { radius: 5, letter: 11 },
  28: { radius: 5, letter: 14 },
  40: { radius: 8, letter: 20 },
};

/** The file a size draws: the 64 px file up to 20 px, the 128 px file above, so each is sharp on a dense screen. */
export const logoFileSizeOf = (size: CompanyLogoSize): InterviewLogoSize => (size <= 20 ? 64 : 128);

/** The address of the logo a size draws; null when the company has none, and the letter is drawn. */
export const companyLogoSrcOf = (company: InterviewCompanyRef, size: CompanyLogoSize): string | null =>
  company.logo ? interviewLogoPath(company.slug, logoFileSizeOf(size)) : null;

/** The letter drawn for a company with no logo: the first letter or digit of its name, in capitals. */
export function companyLetterOf(name: string): string {
  const first = Array.from(name.trim()).find((character) => /[\p{L}\p{N}]/u.test(character));
  return (first ?? '?').toLocaleUpperCase('en-US');
}
