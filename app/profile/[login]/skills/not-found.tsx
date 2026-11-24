import { SkillsMissingScreen } from '../components/skills-missing-screen';

/**
 * A Skills address with no public page: the same "not found" for everyone (and never indexed), whether the person has
 * nothing to show, hid their page or is not known. Its owner's own page takes its place in the browser, inside the
 * profile's left column that the Skills layout draws.
 */
export default function SkillsNotFound() {
  return <SkillsMissingScreen />;
}
