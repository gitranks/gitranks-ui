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
import { skillsJsonLdOf, skillsMetadataOf } from '@/lib/skills/seo';
import { loadSkillsPage } from '@/lib/skills/skills.data';
import { profileCacheTag } from '@/utils/profile-refresh';

export async function generateMetadata({ params }: PageProps<'/profile/[login]/skills'>): Promise<Metadata> {
  const { login } = await params;
  const [skills, learnOpen, user] = await Promise.all([
    loadSkillsPage(login),
    fetchLearnForVisitors(),
    fetchProfilePageOverview(login),
  ]);
  if (!user || !skills.value) return { title: 'No Skills page', robots: { index: false, follow: false } };
  return skillsMetadataOf(skills.value, { name: user.name, learnOpen });
}

/**
 * A person's Skills tab: what they proved with GitRanks, the same page for everyone, cached fifteen minutes under the
 * person's tag (which hiding the page expires at once); a failed read is kept for minutes. A person with no public page
 * gets the "no Skills page" end, the same for everyone; its owner's view is read in the browser, never here.
 */
export default async function ProfileSkills({ params }: PageProps<'/profile/[login]/skills'>) {
  const { login } = await params;
  cacheTag(profileCacheTag(login), skillsTag(login));

  const [user, skills, learnOpen] = await Promise.all([
    fetchProfilePageOverview(login),
    loadSkillsPage(login),
    fetchLearnForVisitors(),
  ]);
  if (skills.failed) {
    cacheLife('minutes');
  } else {
    cacheLife({ stale: 300, revalidate: 900, expire: 86_400 });
  }

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
