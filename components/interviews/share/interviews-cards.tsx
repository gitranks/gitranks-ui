import type { ReactElement } from 'react';

import { companyLetterOf } from '@/lib/interviews/company-logo';
import {
  CARD_TOP_COMPANIES,
  COMPANY_CARD_EYEBROW,
  cardAddressSizeOf,
  cardNoticeOf,
  cardTitleSizeOf,
  cardTitleTextOf,
  companyCardAddressOf,
  companyCardLineOf,
  companyCardTitleOf,
  INTERVIEWS_CARD_ADDRESS,
  INTERVIEWS_CARD_EYEBROW,
  INTERVIEWS_CARD_HEADLINE,
  INTERVIEWS_CARD_LINE,
  PLAN_CARD_EYEBROW,
  planCardAddressOf,
  planCardLineOf,
  planCardTitleOf,
} from '@/lib/interviews/share-card';
import type { InterviewCompanyPage, InterviewCompanyRef, InterviewPlanPage } from '@/lib/interviews/types';
import { CARD_COLORS, Frame } from '@/lib/social-card/card-parts';

/*
 * The three pictures a posted link to Interviews shows: Interviews home (How it works uses it too), a company and a
 * plan. Plain elements in the card's inline styles, as Learn's pictures are: the server draws them as PNGs. Light
 * colours only. A picture is the same for everyone: no person's plans, no count of people, never a zero.
 */

/** The logo's square, as the pages draw it: white with a thin border; the letter on the muted fill with no logo. */
const LOGO_RULE = '#e4e4e7';
const LETTER_FILL = '#f4f4f5';
const LETTER_INK = '#71717a';

/** A company's logo in its square (`logo`: the PNG as base64), or its first letter in the same square. */
export function CardLogo({
  company,
  logo,
  size,
}: Readonly<{ company: Pick<InterviewCompanyRef, 'name'>; logo: string | null; size: 64 | 96 }>): ReactElement {
  const radius = size === 96 ? 18 : 12;
  const square = {
    display: 'flex',
    width: size,
    height: size,
    flex: 'none',
    borderRadius: radius,
    border: `1px solid ${LOGO_RULE}`,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  } as const;
  if (logo) {
    return (
      <div style={{ ...square, background: CARD_COLORS.paper }}>
        <img src={`data:image/png;base64,${logo}`} alt="" width={size - 2} height={size - 2} />
      </div>
    );
  }
  return (
    <div
      style={{
        ...square,
        background: LETTER_FILL,
        color: LETTER_INK,
        fontSize: size / 2,
        fontWeight: 600,
        lineHeight: 1,
      }}
    >
      {companyLetterOf(company.name)}
    </div>
  );
}

/** The page's address in the foot's right corner, in the card's mono type. */
function Address({ address }: Readonly<{ address: string }>) {
  return (
    <div
      style={{
        display: 'flex',
        fontFamily: 'JetBrains Mono',
        fontWeight: 700,
        fontSize: cardAddressSizeOf(address),
        color: CARD_COLORS.muted,
        whiteSpace: 'nowrap',
      }}
    >
      {address}
    </div>
  );
}

/** The foot: what stands on its left (the logos, or the notice), and the address on its right. */
function Foot({ children, address }: Readonly<{ children?: ReactElement | null; address: string }>) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 26, color: CARD_COLORS.muted }}>
        {children ?? null}
      </div>
      <Address address={address} />
    </div>
  );
}

/** The name and the line under it, beside the company's logo when there is one. */
function Middle({
  title,
  size,
  line,
  logo,
}: Readonly<{ title: string; size: number; line: string | null; logo?: ReactElement }>) {
  const width = logo ? 900 : 1010;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
      {logo ?? null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            fontSize: size,
            fontWeight: 700,
            lineHeight: 1.18,
            maxWidth: width,
            letterSpacing: -0.5,
          }}
        >
          {title}
        </div>
        {line ? (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              fontSize: 30,
              lineHeight: 1.35,
              color: CARD_COLORS.muted,
              maxWidth: width,
            }}
          >
            {line}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Interviews' picture: the landing's headline, its line, and the logos of the top five companies. */
export function InterviewsShareCard({
  top,
  logos,
}: Readonly<{ top: readonly InterviewCompanyRef[]; logos: ReadonlyMap<string, string | null> }>): ReactElement {
  const shown = top.slice(0, CARD_TOP_COMPANIES);
  return (
    <Frame eyebrow={INTERVIEWS_CARD_EYEBROW} brand="start">
      <Middle title={INTERVIEWS_CARD_HEADLINE} size={62} line={INTERVIEWS_CARD_LINE} />
      <Foot address={INTERVIEWS_CARD_ADDRESS}>
        {shown.length ? (
          <div style={{ display: 'flex', gap: 14 }}>
            {shown.map((company) => (
              <CardLogo key={company.slug} company={company} logo={logos.get(company.slug) ?? null} size={64} />
            ))}
          </div>
        ) : null}
      </Foot>
    </Frame>
  );
}

/** A company's picture: its logo and name, how many plans for how many positions, and the notice. */
export function CompanyShareCard({
  page,
  logo,
}: Readonly<{ page: Pick<InterviewCompanyPage, 'company' | 'positions'>; logo: string | null }>): ReactElement {
  const title = cardTitleTextOf(companyCardTitleOf(page.company));
  return (
    <Frame eyebrow={COMPANY_CARD_EYEBROW} brand="start">
      <Middle
        title={title}
        size={cardTitleSizeOf(title, 'company')}
        line={companyCardLineOf(page)}
        logo={<CardLogo company={page.company} logo={logo} size={96} />}
      />
      <Foot address={companyCardAddressOf(page.company.slug)}>
        <div style={{ display: 'flex' }}>{cardNoticeOf(page.company.name)}</div>
      </Foot>
    </Frame>
  );
}

/** A plan's picture: the company's logo, the plan's name, its rounds in one line, and the notice. */
export function PlanShareCard({
  plan,
  logo,
}: Readonly<{ plan: Pick<InterviewPlanPage, 'company' | 'name' | 'rounds'>; logo: string | null }>): ReactElement {
  const title = cardTitleTextOf(planCardTitleOf(plan));
  return (
    <Frame eyebrow={PLAN_CARD_EYEBROW} brand="start">
      <Middle
        title={title}
        size={cardTitleSizeOf(title, 'plan')}
        line={planCardLineOf(plan)}
        logo={<CardLogo company={plan.company} logo={logo} size={96} />}
      />
      <Foot address={planCardAddressOf(plan.company.slug)}>
        <div style={{ display: 'flex' }}>{cardNoticeOf(plan.company.name)}</div>
      </Foot>
    </Frame>
  );
}
