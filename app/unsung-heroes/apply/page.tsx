import type { Metadata } from 'next';

import { HeroApplyScreen } from './components/hero-apply-screen';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { applyCaller, readHeroApply } from '@/lib/unsung-hero/apply-api';
import { APPLY_DESCRIPTION, APPLY_TITLE } from '@/lib/unsung-hero/apply-copy';
import { UNSUNG_HERO_APPLY_PATH } from '@/lib/unsung-hero/unsung-hero';

// Reads the session, so it renders on request. A visitor (and a crawler) gets the rules and the sign-in; the
// registries come from one read shared by every visitor.
export const instant = false;

export const metadata: Metadata = pageMetadata({
  title: APPLY_TITLE,
  description: APPLY_DESCRIPTION,
  path: UNSUNG_HERO_APPLY_PATH,
});

export default async function HeroApplyPage() {
  const caller = await applyCaller();
  const view = await readHeroApply(caller);
  return <HeroApplyScreen view={view} signedIn={!!caller.githubLogin} />;
}
