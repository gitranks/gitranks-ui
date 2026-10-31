import type { Metadata } from 'next';

import { A, B, LegalPage, type LegalSection, List, P } from '@/components/legal/legal-page';
import { CONTACT_EMAIL, OPERATOR_ADDRESS, OPERATOR_NAME } from '@/lib/legal';
import { pageMetadata } from '@/lib/seo/page-metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Privacy policy',
  description:
    'What personal data GitRanks and GitRanks Contribute process about developers, signed-in users, maintainers and visitors, why, who receives it, how long it is kept, and how to remove your data.',
  path: '/privacy',
});

/*
 * The Privacy policy. Short on purpose: the information GDPR Articles 13 and 14 require, and no promise the law
 * doesn't. Retention is stated by criteria (Art. 13(2)(a) allows it), not periods. The Privacy tab and its removal
 * dialog link to #removal: keep that anchor. It covers GitRanks, Contribute included (#contribute). Have a lawyer
 * review it.
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
          The basic sign-in lets us read your profile and email address when you sign in; we don&apos;t keep the access
          it grants, except briefly for the maintainers page (see <A href="#contribute">GitRanks Contribute</A>).
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
    id: 'contribute',
    title: 'GitRanks Contribute',
    body: (
      <>
        <P>
          GitRanks Contribute suggests issues in public repositories, helps you work on them with an AI agent and opens
          pull requests from your GitHub account. This section covers what it adds to the above. Basis: contract
          (Article 6(1)(b)), to provide what you ask for, unless stated otherwise.
        </P>
        <List>
          <li>
            <B>Your account and settings</B>: your GitHub username and account id, your email address if your sign-in
            shared it, your Contribute settings and preferences (such as languages, topics, the kinds and size of
            issues, and the repositories you choose or ignore), the providers you asked to hear about, and the feedback
            you send us (we also receive it as a message). To suggest issues, we also use what we know and work out from
            your public work, such as topics, languages and seniority (see{' '}
            <A href="#developers">Developers on GitRanks</A>).
          </li>
          <li>
            <B>Your AI provider key</B>: if you connect one, we store it encrypted and show only its last four
            characters. We use it to check that it works and to run the agent on your behalf, at your cost. We also keep
            the ids of the organization and workspace it belongs to, the agent setup we create there, and what each run
            cost. Removing the key in Contribute&apos;s settings deletes it from GitRanks; delete it at your provider
            too.
          </li>
          <li>
            <B>Agent runs</B>: a run takes place in a sandbox at your AI provider, under your key. We send it the issue
            with its labels and comments (including their authors&apos; usernames), other pull requests and claims on
            it, the repository&apos;s contributing guidelines and pull request template, our notes on the repository
            and, on a follow-up, the review comments on your pull request. The sandbox reads the repository&apos;s
            public code. We keep what the run returns (such as the change, its summary, test results and drafted
            replies), our checks of it, its history and its cost. When a run ends, we ask the provider to delete it.
            Your provider&apos;s own terms and privacy policy apply to what it processes under your key.
          </li>
          <li>
            <B>Your own agent</B>: if you create a token for your own agent, we keep a hash of it, its last four
            characters, the name you give it and when it was last used. We keep what your agent sends us, such as the
            issues it claims, its changes, the build and test commands it reports, and its name and model. Your agent
            and the AI it uses are yours; we receive what your agent sends us.
          </li>
          <li>
            <B>GitHub access for pull requests</B>: if you allow it, GitHub gives us a token that can act for you on
            public repositories, including ones you can write to (GitHub&apos;s <B>public_repo</B> permission). We store
            it encrypted and use it to fork repositories, push branches, open pull requests, and post and resolve
            comments on them, as you approve or as your Contribute settings allow. Forks, commits, pull requests and
            comments are made under your GitHub account and are public on GitHub. We record the pull requests opened
            through Contribute and read their status, reviews, comments and checks from GitHub. You can revoke this
            access at any time in your GitHub settings, under Applications.
          </li>
          <li>
            <B>AI-assisted work</B>: pull requests Contribute opens for you say in their text that they were made with
            AI. We mark those, and pull requests your own agent opens for an issue it claimed through Contribute, as
            AI-assisted in our data, and may show or weigh them apart from the rest of your work wherever we show or
            score it.
          </li>
          <li>
            <B>The issues we suggest</B>: Contribute reads public issues, their comments and labels, and public
            repository files from GitHub, including the usernames of the people who wrote them. We send some of this to
            our AI providers to sort the issues. We keep it while it is public on GitHub and Contribute needs it. Basis:
            legitimate interests, in suggesting issues worth working on.
          </li>
          <li>
            <B>Maintainers</B>: the maintainers page has you sign in with GitHub to list the repositories you maintain
            and let you opt them out of Contribute. The token GitHub gives that sign-in is kept in your encrypted
            sign-in cookie and used for up to one hour, on that page only. When you opt a repository out, we keep your
            GitHub account id and username and when you did it, until the repository is opted back in. Basis: legitimate
            interests, in respecting maintainers&apos; choices.
          </li>
          <li>
            <B>Deleting it</B>: in Contribute&apos;s settings, choose <B>Delete all Contribute data</B>. It stops runs
            under way, deletes your key, settings, preferences, suggestions, runs and their history, drafted replies,
            agent tokens and feedback, and revokes the GitHub access. If GitHub can&apos;t be told, revoke the access in
            your GitHub settings. Removing your data from GitRanks (see <A href="#removal">Removing your data</A>) does
            the same. Forks, commits, pull requests and comments on GitHub stay there, as does your key at your AI
            provider, and so do the copies of your feedback we received as messages. We may keep records of the pull
            requests opened through Contribute and that they were AI-assisted.
          </li>
        </List>
      </>
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
          <A href="#cookies">Cookies</A>). Basis: legitimate interests, in knowing how the site is used.
        </li>
        <li>
          <B>Links in our posts</B>: when you open GitRanks from a link in one of our social posts, we count the click
          with your IP address, browser and the page you came from. Basis: legitimate interests, in knowing which posts
          work.
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
          Hetzner (hosting), Google (analytics), Telegram (notifications to us) and our AI providers.
        </li>
        <li>GitHub, when we read public data and check stars, and when Contribute acts for you.</li>
        <li>
          The AI provider whose key you connect to Contribute (currently Anthropic), under your own account with it.
        </li>
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
        Our servers are in the EU (Finland), and GitRanks is run from Ukraine. Some providers are in the United States.
        For them we rely on the EU-US Data Privacy Framework (and its UK extension) where the provider is certified, and
        otherwise on standard contractual clauses. Write to {mail} for a copy. Contribute sends data to the AI provider
        you connect, which may be outside the EU, at your request and under your own agreement with it.
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
        <li>
          Contribute data: what you give or create there, until you delete it or remove your data; other Contribute data
          as described under <A href="#contribute">GitRanks Contribute</A>.
        </li>
        <li>Logs and security data: deleted automatically after a fixed rotation period.</li>
        <li>
          Analytics: as set in our Google Analytics settings. Clicks on links in our posts: until the statistics about
          those posts no longer need them.
        </li>
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
            GitHub username. We remove the data once we&apos;ve confirmed the request comes from that address. If your
            GitHub email is hidden, sign in and use the Privacy tab instead.
          </li>
        </List>
        <P>
          A removal deletes your profile, your ranks and their history, the repositories you own, and your place in
          rankings, contributor tables and our posts on GitRanks. It also deletes your sign-in, your token, your refresh
          records and your Contribute data (see <A href="#contribute">GitRanks Contribute</A>). Your badges stop
          working. A removal can&apos;t be undone, and GitRanks won&apos;t list your account again, even if you sign in.
          To be listed again, write to us.
        </P>
        <P>We keep only:</P>
        <List>
          <li>a one-way hash of your GitHub account id and username, so nothing adds your account back;</li>
          <li>
            records against fake stars on other accounts that name your account, for as long as fair rankings need them;
          </li>
          <li>
            records of pull requests opened through Contribute and whether they were AI-assisted, and any repository
            opt-out you made as a maintainer, until it is lifted;
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
          <B>Needed for the site</B>: the sign-in session, a cookie that tells the page you&apos;re signed in,
          short-lived security cookies during sign-in, and Cloudflare&apos;s security cookies.
        </li>
        <li>
          <B>Analytics</B>: Google Analytics cookies, which tell repeat visits apart.
        </li>
        <li>
          <B>In your browser only</B>: your theme, which post links have already been counted in this tab and, for
          Contribute, a few details for the open tab, such as a step to finish after you grant GitHub access.
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
