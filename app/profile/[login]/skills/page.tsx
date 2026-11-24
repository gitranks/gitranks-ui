'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { LayoutLeftColumn } from '../components/layout-left-column';
import { SkillsHeading } from '../components/skills-owner';
import { SkillsScreen } from '../components/skills-screen';
import { fetchLearnForVisitors } from '@/app/components/landing/landing-data';
import { JsonLd } from '@/components/json-ld/json-ld';
import { fetchProfilePageOverview } from '@/graphql/helpers/fetch-profile-page-overview';
import { skillsTag } from '@/lib/skills/paths';
import { skillsJsonLdOf, skillsMetadataOf, skillsTitleOf } from '@/lib/skills/seo';
import { loadSkillsPage } from '@/lib/skills/skills.data';
import { profileCacheTag } from '@/utils/profile-refresh';

export async function generateMetadata({ params }: PageProps<'/profile/[login]/skills'>): Promise<Metadata> {
  const { login } = await params;
  const [skills, learnOpen, user] = await Promise.all([
    loadSkillsPage(login),
    fetchLearnForVisitors(),
    fetchProfilePageOverview(login),
  ]);
  if (skills.failed) return { title: { absolute: skillsTitleOf(login) }, robots: { index: false, follow: false } };
  if (!user || !skills.value) return { title: 'No Skills page', robots: { index: false, follow: false } };
  return skillsMetadataOf(skills.value, { name: user.name, learnOpen });
}

/** A failed read is an error, never "no Skills page"; while the site is built it is a "not found" kept for minutes. */
const failedRead = (login: string) => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    cacheLife('minutes');
    notFound();
  }
  throw new Error(`The Skills page of ${login} could not be read.`);
};

/**
 * A person's Skills tab: what they proved with GitRanks, the same page for everyone, cached fifteen minutes under the
 * person's tag (which hiding the page expires at once). "Not found" only ever means no public page: the same for
 * everyone, with its owner's view read in the browser, never here. A failed read shows the error page instead.
 */
export default async function ProfileSkills({ params }: PageProps<'/profile/[login]/skills'>) {
  const { login } = await params;
  cacheTag(profileCacheTag(login), skillsTag(login));

  const [user, skills, learnOpen] = await Promise.all([
    fetchProfilePageOverview(login),
    loadSkillsPage(login),
    fetchLearnForVisitors(),
  ]);
  if (skills.failed) failedRead(login);
  cacheLife({ stale: 300, revalidate: 900, expire: 86_400 });

  if (!user || !skills.value) {
    notFound();
  }

  return (
    <LayoutLeftColumn user={user}>
      <JsonLd payloads={skillsJsonLdOf(skills.value, { name: user.name, learnOpen })} />
      <SkillsHeading />
      <SkillsScreen login={login} page={skills.value} learnOpen={learnOpen} now={new Date()} />
    </LayoutLeftColumn>
  );
}
