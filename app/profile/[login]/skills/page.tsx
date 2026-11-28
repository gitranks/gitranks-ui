'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';

import { SkillsHeading } from '../components/skills-owner';
import { SkillsScreen } from '../components/skills-screen';
import { JsonLd } from '@/components/json-ld/json-ld';
import { fetchProfilePageOverview } from '@/graphql/helpers/fetch-profile-page-overview';
import { skillsTag } from '@/lib/skills/paths';
import { skillsJsonLdOf, skillsMetadataOf, skillsTitleOf } from '@/lib/skills/seo';
import { loadSkillsPage } from '@/lib/skills/skills.data';
import { profileCacheTag } from '@/utils/profile-refresh';

export async function generateMetadata({ params }: PageProps<'/profile/[login]/skills'>): Promise<Metadata> {
  const { login } = await params;
  const [skills, user] = await Promise.all([loadSkillsPage(login), fetchProfilePageOverview(login)]);
  if (skills.failed) return { title: { absolute: skillsTitleOf(login) }, robots: { index: false, follow: false } };
  if (!user || !skills.value) return { title: 'No Skills page', robots: { index: false, follow: false } };
  return skillsMetadataOf(skills.value, { name: user.name });
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
 * everyone, with its owner's view read in the browser, never here, and read again after a minute, so a page that
 * comes into being shows soon. A failed read shows the error page instead. The
 * profile's left column is the layout's, around this page and its "not found" alike.
 */
export default async function ProfileSkills({ params }: PageProps<'/profile/[login]/skills'>) {
  const { login } = await params;
  cacheTag(profileCacheTag(login), skillsTag(login));

  const [user, skills] = await Promise.all([fetchProfilePageOverview(login), loadSkillsPage(login)]);
  if (skills.failed) failedRead(login);

  if (!user || !skills.value) {
    cacheLife('minutes');
    notFound();
  }
  cacheLife({ stale: 300, revalidate: 900, expire: 86_400 });

  return (
    <>
      <JsonLd payloads={skillsJsonLdOf(skills.value, { name: user.name })} />
      <SkillsHeading />
      <SkillsScreen login={login} page={skills.value} now={new Date()} />
    </>
  );
}
