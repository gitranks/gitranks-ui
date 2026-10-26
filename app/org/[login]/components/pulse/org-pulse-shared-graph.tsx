import type { FC } from 'react';

import { avatarSrc } from '@/components/pulse/pulse.utils';
import type { PageOrgQuery } from '@/types/generated/graphql';

export type OrgPulseSharedOrgRow = NonNullable<
  NonNullable<PageOrgQuery['organization']>['pulse']
>['sharedContributorOrgs'][number];

type OrgPulseSharedGraphProps = {
  login: string;
  avatarUrl?: string | null;
  orgs: OrgPulseSharedOrgRow[];
};

const SIZE = 240;
const CENTER = SIZE / 2;
const RADIUS = 86;
const CENTER_AVATAR = 52;
const AVATAR = 40;
const MIN_EDGE = 1.5;
const MAX_EDGE = 8;

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * The org in the centre and the orgs that share its contributors around it, each edge as wide as
 * the shared count (relative to the largest). It is in the page HTML; the list beside it holds the
 * same numbers as text.
 */
export const OrgPulseSharedGraph: FC<OrgPulseSharedGraphProps> = ({ login, avatarUrl, orgs }) => {
  const max = Math.max(1, ...orgs.map((org) => org.sharedContributors));
  const nodes = orgs.map((org, i) => {
    // From the top, clockwise.
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / orgs.length;
    return {
      org,
      x: round(CENTER + RADIUS * Math.cos(angle)),
      y: round(CENTER + RADIUS * Math.sin(angle)),
      width: round(MIN_EDGE + ((MAX_EDGE - MIN_EDGE) * org.sharedContributors) / max),
    };
  });
  const id = (key: string) => `shared-${login}-${key}`.replace(/[^\w-]/g, '_');

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-52" aria-hidden focusable="false">
      <defs>
        <clipPath id={id('center')}>
          <circle cx={CENTER} cy={CENTER} r={CENTER_AVATAR / 2} />
        </clipPath>
        {nodes.map(({ org, x, y }) => (
          <clipPath key={org.login} id={id(org.login)}>
            <circle cx={x} cy={y} r={AVATAR / 2} />
          </clipPath>
        ))}
      </defs>
      {nodes.map(({ org, x, y, width }) => (
        <line
          key={org.login}
          x1={CENTER}
          y1={CENTER}
          x2={x}
          y2={y}
          className="stroke-muted-foreground"
          strokeOpacity={0.45}
          strokeWidth={width}
          strokeLinecap="round"
        />
      ))}
      {nodes.map(({ org, x, y }) => {
        const src = org.organization?.avatarUrl;
        return (
          <g key={org.login}>
            <circle cx={x} cy={y} r={AVATAR / 2 + 2} className="fill-card stroke-border" />
            {src ? (
              <image
                href={avatarSrc(src, AVATAR)}
                x={x - AVATAR / 2}
                y={y - AVATAR / 2}
                width={AVATAR}
                height={AVATAR}
                clipPath={`url(#${id(org.login)})`}
              />
            ) : (
              <circle cx={x} cy={y} r={AVATAR / 2} className="fill-muted" />
            )}
          </g>
        );
      })}
      <circle cx={CENTER} cy={CENTER} r={CENTER_AVATAR / 2 + 2} className="fill-card stroke-border" />
      {avatarUrl ? (
        <image
          href={avatarSrc(avatarUrl, CENTER_AVATAR)}
          x={CENTER - CENTER_AVATAR / 2}
          y={CENTER - CENTER_AVATAR / 2}
          width={CENTER_AVATAR}
          height={CENTER_AVATAR}
          clipPath={`url(#${id('center')})`}
        />
      ) : (
        <circle cx={CENTER} cy={CENTER} r={CENTER_AVATAR / 2} className="fill-muted" />
      )}
    </svg>
  );
};
