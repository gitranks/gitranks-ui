import { DocLayout, DocSection, HashSafeLink, MorePages, PublicPageHead } from './public-pages';
import { FAQ_GROUPS } from '@/lib/contribute/faq';
import { CONTACT_EMAIL } from '@/lib/legal';

/** The questions people ask before they start, in groups: contribution, the guardrails, the credits, the record. */
export function FaqScreen() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 flex flex-col gap-9 pt-10 pb-16">
      <PublicPageHead eyebrow="Contribute · Questions" title="Questions before you start">
        <p>
          Your agent fixes open-source issues. You approve every PR. Here is what that means for you, for the
          maintainers and for your credits. Anything missing?{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-link hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </PublicPageHead>

      <DocLayout sections={FAQ_GROUPS.map(({ id, title }) => ({ id, title }))}>
        {FAQ_GROUPS.map(({ id, title, entries }) => (
          <DocSection key={id} id={id} title={title}>
            <dl className="flex flex-col gap-6">
              {entries.map(({ id: entry, question, answer, more }) => (
                <div key={entry} id={entry} className="flex scroll-mt-6 flex-col gap-1.5">
                  <dt className="text-base font-semibold">{question}</dt>
                  <dd className="flex flex-col gap-1.5 text-foreground/80">
                    <p>{answer}</p>
                    {more ? (
                      <HashSafeLink href={more.href} className="self-start font-semibold text-link hover:underline">
                        {more.label} →
                      </HashSafeLink>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </DocSection>
        ))}
      </DocLayout>

      <MorePages current="faq" />
    </main>
  );
}
