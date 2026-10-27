import type { Metadata } from 'next';

import { A, LegalPage, type LegalSection, List, P } from '@/components/legal/legal-page';
import { CONTACT_EMAIL, OPERATOR_ADDRESS, OPERATOR_NAME } from '@/lib/legal';
import { pageMetadata } from '@/lib/seo/page-metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Terms of service',
  description: 'The terms for using GitRanks: rankings, signing in, refreshes, badges, fair use and liability.',
  path: '/terms',
});

/*
 * The Terms of service. Short on purpose: what EU/UK consumer law requires for a free service, plus the clauses that
 * protect the operator. No promise the law doesn't require, and no numbers the site shows and may change (limits,
 * thresholds, how often refreshes are offered). lib/legal.ts lists the open points for a lawyer.
 */

const mail = <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>;

const sections: LegalSection[] = [
  {
    id: 'who',
    title: 'Who we are',
    body: (
      <P>
        GitRanks (gitranks.com) is run by {OPERATOR_NAME}, a sole trader in Ukraine, at {OPERATOR_ADDRESS}.
        &quot;We&quot; and &quot;us&quot; mean the operator. Contact: {mail}. These terms are the agreement between you
        and us. By using GitRanks, its badges or its sign-in, you accept them. The <A href="/privacy">Privacy policy</A>{' '}
        explains how we handle personal data.
      </P>
    ),
  },
  {
    id: 'service',
    title: 'What GitRanks does',
    body: (
      <List>
        <li>
          GitRanks ranks GitHub accounts, organizations and repositories by their public activity, and publishes
          profiles, statistics, badges and posts about them.
        </li>
        <li>
          Rankings are computed automatically from public data. They are estimates and can be incomplete, out of date or
          wrong. They are not an endorsement or an assessment of anyone&apos;s skills, and we don&apos;t guarantee any
          rank or result.
        </li>
        <li>GitRanks is not affiliated with or endorsed by GitHub.</li>
      </List>
    ),
  },
  {
    id: 'accounts',
    title: 'Signing in',
    body: (
      <List>
        <li>
          You sign in with your GitHub account, and only with your own. You are responsible for what happens under your
          sign-in, unless it isn&apos;t your fault.
        </li>
        <li>
          If you sign in with your own token, you let us use it to read GitHub data for the refreshes you ask for, on
          your own GitHub limits. You can revoke it at any time in your GitHub settings.
        </li>
        <li>Signing in is for people aged 16 and over.</li>
      </List>
    ),
  },
  {
    id: 'refreshes',
    title: 'Refreshes and stars',
    body: (
      <List>
        <li>
          Some refreshes of your own profile are offered for a star on our GitHub repository. Starring is your choice.
          We check the star with GitHub when you ask for the refresh.
        </li>
        <li>
          Which refreshes are offered, and their limits, are shown on the site and may change. Refreshes run on public
          GitHub data and can be delayed or fail when GitHub limits us.
        </li>
      </List>
    ),
  },
  {
    id: 'badges',
    title: 'Badges and links',
    body: (
      <P>
        You may embed GitRanks badges and link to GitRanks pages, for example in a README or on a website. We may change
        how badges look and what they show, and stop serving a badge, for example after its account&apos;s data is
        removed.
      </P>
    ),
  },
  {
    id: 'use',
    title: 'Fair use',
    body: (
      <>
        <P>You must not:</P>
        <List>
          <li>manipulate rankings, for example with bought or exchanged stars, fake accounts or automated activity;</li>
          <li>
            scrape GitRanks, use bots or automated access beyond normal use of the site and its badges, overload it, or
            get around its limits or security;
          </li>
          <li>sign in as someone else, or ask for data to be removed for an account that isn&apos;t yours;</li>
          <li>
            use what GitRanks shows to spam, harass or profile developers, or for anything that breaks the law or
            GitHub&apos;s terms.
          </li>
        </List>
      </>
    ),
  },
  {
    id: 'fairness',
    title: 'Keeping rankings fair',
    body: (
      <P>
        We may leave out stars, hold or lower a rank, or remove an account from rankings when we reasonably believe the
        ranking is being manipulated. If you think we got it wrong, use the button on your profile or write to {mail}.
      </P>
    ),
  },
  {
    id: 'content',
    title: 'Content',
    body: (
      <List>
        <li>
          The data GitRanks shows comes from GitHub and belongs to its owners. We show it as GitHub&apos;s terms allow.
        </li>
        <li>
          GitRanks&apos; scores, rankings, texts, design and badges are ours. The source code of the website is
          published under the terms of its repository.
        </li>
      </List>
    ),
  },
  {
    id: 'removal',
    title: 'Removing your data',
    body: (
      <P>
        You can have your GitRanks data removed at any time, from the Privacy tab of your profile or by email, as the{' '}
        <A href="/privacy#removal">Privacy policy</A> describes. A removal is permanent.
      </P>
    ),
  },
  {
    id: 'ending',
    title: 'Changes, suspension and ending',
    body: (
      <List>
        <li>
          GitRanks is free. We may change, limit or stop it, or any part of it, at any time, including rankings, badges,
          refreshes and their limits.
        </li>
        <li>
          We may block access or a sign-in if we reasonably believe you broke these terms or the law, or to prevent
          abuse or harm to people or the service.
        </li>
        <li>You can stop using GitRanks at any time.</li>
        <li>We may transfer this agreement to someone who takes over GitRanks; your rights stay the same.</li>
      </List>
    ),
  },
  {
    id: 'liability',
    title: 'Disclaimers and liability',
    body: (
      <>
        <P>
          If you are a consumer, you have legal rights for digital content and services; nothing in these terms affects
          them.
        </P>
        <P>
          GitRanks is free and provided as is and as available. We are not responsible for decisions anyone makes based
          on a rank or a profile, for GitHub&apos;s data or availability, or for loss that was not foreseeable.
        </P>
        <P>
          Nothing in these terms limits liability for intent or gross negligence, death, personal injury or damage to
          health, fraud, or anything else the law doesn&apos;t allow us to limit.
        </P>
      </>
    ),
  },
  {
    id: 'law',
    title: 'Law and disputes',
    body: (
      <P>
        These terms are governed by the law of Ukraine, and disputes go to the courts of Ukraine. If you are a consumer,
        you keep the protection of the mandatory laws of the country where you live and can bring a claim in its courts.
      </P>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: (
      <P>
        We may change these terms by posting a new version here with a new date. If you keep using GitRanks after a
        change, the new terms apply; if you don&apos;t agree, stop using it and, if you want, remove your data.
        Questions: {mail}.
      </P>
    ),
  },
];

export default function Terms() {
  return <LegalPage title="Terms of service" sections={sections} />;
}
