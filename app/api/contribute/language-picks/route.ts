import { type NextRequest, NextResponse } from 'next/server';

import { isPoolLanguage, type LanguagePicksAnswer } from '@/lib/contribute/profile-picks';
import { loadLanguagePicks } from '@/lib/contribute/profile-picks.data';

/** The same for everyone: browsers and the edge may keep it a few minutes, like the server does. */
const PUBLIC = { 'Cache-Control': 'public, max-age=60, s-maxage=300' };

/**
 * The profile block's picks for a visitor: a pool language's 3 issues of the day (`?language=GO`), the same for every
 * profile in that language, so the answer names no profile. Empty for anything else, and on any failure.
 */
export async function GET(req: NextRequest) {
  const language = req.nextUrl.searchParams.get('language');
  const answer: LanguagePicksAnswer = isPoolLanguage(language)
    ? await loadLanguagePicks(language)
    : { issues: [], stats: null };
  return NextResponse.json(answer, { headers: PUBLIC });
}
