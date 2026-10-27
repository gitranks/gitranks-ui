import type { Metadata } from 'next';

import { A, B, LegalPage, type LegalSection, List, P } from '@/components/legal/legal-page';
import { CONTACT_EMAIL, OPERATOR_ADDRESS, OPERATOR_NAME } from '@/lib/legal';
import { pageMetadata } from '@/lib/seo/page-metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Privacy policy',
  description:
    'What personal data GitRanks processes about developers, signed-in users and visitors, why, who receives it, how long it is kept, and how to remove your data.',
  path: '/privacy',
});

/*
 * The Privacy policy. Short on purpose: the information GDPR Articles 13 and 14 require, and no promise the law
 * doesn't. Retention is stated by criteria (Art. 13(2)(a) allows it), not periods. The Privacy tab and its removal
 * dialog link to #removal: keep that anchor. It covers GitRanks only. lib/legal.ts lists the open points for a lawyer.
 */

const mail = <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>;

const sections: LegalSection[] = [
  {
    id: 'who',
    title: 'Who is responsible',
    body: (
      <>
        <P>
          GitRanks (gitranks.com) is run by {OPERATOR_NAME}, a sole trader in Ukraine, at {OPERATOR_ADDRESS}, the
          controller of the personal data described here. Contact for anything about your data: {mail}.
        </P>
        <P>
          This policy covers the GitRanks website, its badges and its posts on social networks. The GitRanks WhatsApp
          chatbot has <A href="/wa/privacy">its own privacy policy</A>.
        </P>
      </>
    ),
  },
  {
    id: 'developers',
    title: 'Developers on GitRanks',
    body: (
      <>
        <P>
          GitRanks ranks GitHub accounts by their public activity. This section is for the people behind those accounts,
          whether or not they use GitRanks. It is the information GDPR Article 14 requires.
        </P>
        <List>
          <li>
            <B>What we use</B>: what a GitHub account shows publicly. That includes the username, name, avatar, bio,
            company, location, website, the email address and social accounts shown on the profile, organizations,
            followers, public repositories and their stars, contributions to public repositories (commits, pull
            requests, lines changed), and stars given. We also use what we work out from these: the country, the
            languages, scores, ranks, tiers and how they change over time.
          </li>
          <li>
            <B>Sources</B>: GitHub, through its public API and public archives of GitHub activity.
          </li>
          <li>
            <B>Purpose and basis</B>: to publish rankings, profiles, badges and statistics about open-source work, and
            to post highlights about them on social networks. Basis: legitimate interests (Article 6(1)(f)). These are
            ours in running GitRanks, developers&apos; in having their public work recognised, and the public&apos;s in
            finding it.
          </li>
          <li>
            <B>Fair rankings</B>: we check for stars that look bought or exchanged. Where we find them, we may leave
            them out of an account&apos;s score and hold its rank until it is reviewed. Basis: legitimate interests, in
            rankings that can be trusted.
          </li>
          <li>
            <B>Automated ranking</B>: scores, ranks and tiers are computed automatically from public data. They have no
            legal or similarly significant effect on you.
          </li>
          <li>
            <B>Recipients</B>: everyone. Profiles, rankings and badges are public web pages that search engines index,
            and our posts on X, Bluesky and Mastodon may name an account and the social handles its profile links to.
            Also our service providers (see <A href="#recipients">Who receives data</A>).
          </li>
          <li>
            <B>Retention</B>: while the account is public on GitHub. An account GitHub no longer returns is removed
            after a while. You can have your data removed at any time (see <A href="#removal">Removing your data</A>).
          </li>
          <li>
            <B>Not informed directly</B>: GitRanks describes millions of public accounts. Writing to each would mean
            unsolicited email and a disproportionate effort (Article 14(5)(b)), so we publish this information here
            instead.
          </li>
        </List>
      </>
    ),
  },
  {
    id: 'accounts',
    title: 'Signing in',
    body: (
      <List>
        <li>
          <B>Sign in with GitHub</B>: we receive your GitHub username, account id, name, email address and avatar link.
          The basic sign-in gives us no access to your GitHub account.
        </li>
        <li>
          <B>Sign in with your own token</B>: if you choose it, GitHub gives us a token that can act on your behalf. We
          use it only to read GitHub data for the refreshes you ask for, on your own GitHub limits. We keep the token
          until you remove your data. You can revoke it at any time in your GitHub settings, under Applications.
        </li>
        <li>
          <B>Refreshes</B>: when you ask for a refresh that needs a star on our repository, we check with GitHub at that
          moment whether you have starred it. We record the refreshes, star checks and repository updates you ask for,
          so the limits shown on the site can be applied.
        </li>
        <li>
          <B>Basis</B>: contract (Article 6(1)(b)), to provide what you ask for.
        </li>
      </List>
    ),
  },
  {
    id: 'visitors',
    title: 'Visiting the site',
    body: (
      <List>
        <li>
          <B>Technical data</B>: IP address, browser and server logs, used for security, rate limits and to keep the
          site running. Basis: legitimate interests.
        </li>
        <li>
          <B>Analytics</B>: Google Analytics counts visits and how pages are used, with cookies (see{' '}
          <A href="#cookies">Cookies</A>).
        </li>
        <li>
          <B>Links in our posts</B>: when you open GitRanks from a link in one of our social posts, we count the click
          with your IP address, browser and the page you came from, to measure which posts work.
        </li>
      </List>
    ),
  },
  {
    id: 'ai',
    title: 'AI',
    body: (
      <P>
        Some of our posts are drafted with AI from public rankings and statistics. To draft them, we send those public
        data, including account names, to our AI providers. AI output can be wrong.
      </P>
    ),
  },
  {
    id: 'recipients',
    title: 'Who receives data',
    body: (
      <List>
        <li>The public, for profiles, rankings, badges and posts, as described above.</li>
        <li>
          Service providers that process data for us. These currently include Cloudflare (network, security, email),
          Hetzner (hosting), Google (analytics) and our AI providers.
        </li>
        <li>GitHub, when we read public data and check stars.</li>
        <li>Our professional advisers, and authorities where the law requires.</li>
        <li>Someone who takes over GitRanks, if the business is transferred.</li>
      </List>
    ),
  },
  {
    id: 'transfers',
    title: 'International transfers',
    body: (
      <P>
        Our servers are in the EU (Finland). The operator works from Ukraine, which has no EU or UK adequacy decision.
        Some providers are in the United States. For them we rely on the EU-US Data Privacy Framework (and its UK
        extension) where the provider is certified, and otherwise on standard contractual clauses. Write to {mail} for a
        copy.
      </P>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: (
      <List>
        <li>
          Developer data: as described under <A href="#developers">Developers on GitRanks</A>.
        </li>
        <li>
          Sign-in data, tokens and refresh records: until you remove your data. Sign-in sessions last until they expire
          or you sign out.
        </li>
        <li>Logs and security data: deleted automatically after a fixed rotation period.</li>
        <li>
          Backups: deleted automatically at the end of a fixed rotation. Removed data leaves the backups when the last
          backup holding it is deleted.
        </li>
        <li>Removal records: a one-way hash, for as long as GitRanks runs (see below).</li>
        <li>
          Data the law makes us keep, for the period it sets; data needed for a legal claim, until it is settled or
          time-barred.
        </li>
      </List>
    ),
  },
  {
    id: 'removal',
    title: 'Removing your data',
    body: (
      <>
        <P>You can have GitRanks remove its data about your GitHub account in either of two ways:</P>
        <List>
          <li>
            <B>Signed in</B>: open your profile, go to the <B>Privacy</B> tab and choose <B>Remove my data</B>. Only the
            signed-in owner of the account can do this.
          </li>
          <li>
            <B>By email</B>: write to {mail} from the email address your GitHub profile shows publicly, and include your
            GitHub username. We remove the data once the two addresses match. If your GitHub email is hidden, sign in
            and use the Privacy tab instead.
          </li>
        </List>
        <P>
          A removal deletes your profile, your ranks and their history, the repositories you own, and your place in
          rankings, contributor tables and our posts on GitRanks. It also deletes your sign-in, your token and your
          refresh records. Your badges stop working. A removal can&apos;t be undone, and GitRanks won&apos;t list your
          account again, even if you sign in. To be listed again, write to us.
        </P>
        <P>We keep only:</P>
        <List>
          <li>a one-way hash of your GitHub account id and username, so nothing adds your account back;</li>
          <li>
            records against fake stars on other accounts that name your account, for as long as fair rankings need them;
          </li>
          <li>backups, until they are rotated out.</li>
        </List>
        <P>
          Posts we already published on social networks stay there. Ask us and we&apos;ll delete ours, where the network
          allows it. A removal covers GitRanks only.
        </P>
      </>
    ),
  },
  {
    id: 'rights',
    title: 'Your rights',
    body: (
      <>
        <P>
          Under the GDPR, the UK GDPR and Ukrainian law, you can ask for access to your data and a copy of it, and for
          its correction, deletion, restriction or portability.
        </P>
        <P>
          <B>Right to object.</B> Where we rely on legitimate interests, you can object at any time on grounds relating
          to your situation. To object to being ranked, have your data removed as described above.
        </P>
        <P>
          For anything else, write to {mail}. We reply within the time the law requires and may ask you to confirm that
          the account is yours. You can also complain to a data protection authority: in the EU, where you live or work
          or where the alleged infringement took place; in the UK, the ICO; in Ukraine, the Ukrainian Parliament
          Commissioner for Human Rights.
        </P>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies',
    body: (
      <List>
        <li>
          <B>Needed for the site</B>: the sign-in session, short-lived security cookies during sign-in, and
          Cloudflare&apos;s security cookies.
        </li>
        <li>
          <B>Analytics</B>: Google Analytics cookies, which tell repeat visits apart. Google processes this data under
          its own privacy policy.
        </li>
        <li>
          <B>In your browser only</B>: your theme, and which post links have already been counted in this tab.
        </li>
      </List>
    ),
  },
  {
    id: 'age',
    title: 'Age',
    body: <P>Signing in to GitRanks is only for people aged 16 and over.</P>,
  },
  {
    id: 'changes',
    title: 'Changes',
    body: (
      <P>
        We may update this policy by posting a new version here with a new date. Where the law requires, we&apos;ll tell
        you.
      </P>
    ),
  },
];

export default function Privacy() {
  return <LegalPage title="Privacy policy" sections={sections} />;
}
