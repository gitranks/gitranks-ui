import { LANDING_PR_FOOTER } from '@/lib/contribute/landing-copy';

/** The footer a pull request ends with, as a maintainer reads it on GitHub: its links drawn as links, not followed. */
export function LandingPrFooter() {
  return LANDING_PR_FOOTER.map(({ before, link, after }, index) => (
    <span key={link}>
      {index ? <br /> : null}
      {before}
      <span className="text-link">{link}</span>
      {after}
    </span>
  ));
}
