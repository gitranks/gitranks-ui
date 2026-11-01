'use client';

import type { FC, MouseEvent, ReactNode } from 'react';

import { AdaptiveTooltip } from '../adaptive-tooltip/adaptive-tooltip';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { formatNumberShort } from '@/utils/format-number-short';

/** `full` in tables and headers (`1,101,747`), `compact` in cards (`1.1M`), as DESIGN.md has it. */
export type StarCountFormat = 'full' | 'compact';

/** The stars of a developer's or an organization's repositories that don't count. */
export type StarsNotCountedTotal = { stars: number; repositories: number };

const FULL = new Intl.NumberFormat('en-US');

const formatStars = (value: number, format: StarCountFormat) =>
  format === 'compact' ? formatNumberShort(value) : FULL.format(value);

const stars = (count: number) => `${FULL.format(count)} ${count === 1 ? 'star' : 'stars'}`;
const isNot = (count: number) => (count === 1 ? 'isn’t' : 'aren’t');

/** A repository's hover: "206 stars from suspected fake accounts aren't counted. GitHub shows 219." */
export const repoStarsNotCountedText = (notCounted: number, githubStars: number) =>
  `${stars(notCounted)} from suspected fake accounts ${isNot(notCounted)} counted. GitHub shows ${FULL.format(githubStars)}.`;

/**
 * A developer's or an organization's hover: "6,500 stars from suspected fake accounts on 1 repository aren't
 * counted." GitHub shows no total, so it names none.
 */
export const totalStarsNotCountedText = ({ stars: count, repositories }: StarsNotCountedTotal) =>
  `${stars(count)} from suspected fake accounts on ${FULL.format(repositories)} ${repositories === 1 ? 'repository' : 'repositories'} ${isNot(count)} counted.`;

/** A repository's star check: GitHub's count and the stars from suspected fake accounts (`Repo.starsCheck`). */
export type StarsCheck = { notCounted?: number | null; githubStars?: number | null };

/**
 * Whether some of a repository's stars don't count: stars from suspected fake accounts, and a GitHub count to show.
 * The repository page's chip row, `StarsNotCountedTag` and `StarCount`'s strike all ask this, so they agree.
 */
export const hasStarsNotCounted = (
  check: StarsCheck | null | undefined,
): check is { notCounted: number; githubStars: number } =>
  !!check && (check.notCounted ?? 0) > 0 && (check.githubStars ?? 0) > 0;

/** A row the pointer opens (`ClickableRow`) must not open when the hover's trigger is tapped. */
const stopPropagation = (event: MouseEvent) => event.stopPropagation();

type StruckCountProps = {
  /** The honest count: what GitRanks counts and ranks by. */
  stars: number;
  /** The count to strike through before it, when some stars don't count. */
  struck?: number | null;
  /** The hover's text, when there is a struck count. */
  hover?: string;
  /** What the struck count is, for screen readers: "GitHub shows". */
  struckLabel?: string;
  format: StarCountFormat;
  /** Classes on both numbers, such as `font-mono tabular-nums`. */
  numberClassName?: string;
  /** Extra classes on the honest number. */
  className?: string;
  /** Extra classes on the struck number, such as a smaller size. */
  struckClassName?: string;
  /** The pair's gap, `gap-x-1.5` unless set. */
  gapClassName?: string;
  /** Words after the number (" stars"), part of the hover's trigger. */
  suffix?: ReactNode;
  /** `false` draws the pair without a hover, inside another popup. */
  withHover?: boolean;
};

const StruckCount: FC<StruckCountProps> = ({
  stars: honest,
  struck,
  hover,
  struckLabel,
  format,
  numberClassName,
  className,
  struckClassName,
  gapClassName,
  suffix,
  withHover = true,
}) => {
  const honestClassName = cn(numberClassName, className);

  if (!struck || struck <= honest) {
    return (
      <>
        {honestClassName ? (
          <span className={honestClassName}>{formatStars(honest, format)}</span>
        ) : (
          formatStars(honest, format)
        )}
        {suffix}
      </>
    );
  }

  const pair = (
    <>
      <span className={cn('inline-flex items-baseline', gapClassName ?? 'gap-x-1.5')}>
        <s className={cn(numberClassName, 'text-muted-foreground line-through', struckClassName)}>
          {!!struckLabel && <span className="sr-only">{struckLabel} </span>}
          {formatStars(struck, format)}
          <span className="sr-only">, GitRanks counts </span>
        </s>
        <span className={honestClassName || undefined}>{formatStars(honest, format)}</span>
      </span>
      {suffix}
    </>
  );

  if (!withHover || !hover) {
    return pair;
  }

  return (
    <AdaptiveTooltip
      trigger={
        <button
          type="button"
          onClick={stopPropagation}
          className="inline cursor-help rounded-sm text-inherit outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {pair}
        </button>
      }
    >
      <p className="max-w-72">{hover}</p>
    </AdaptiveTooltip>
  );
};

type StarCountBaseProps = Omit<StruckCountProps, 'stars' | 'struck' | 'hover' | 'struckLabel' | 'format'> & {
  stars: number;
  format?: StarCountFormat;
};

export type StarCountProps = StarCountBaseProps & {
  /** GitHub's count, when some of the repository's stars don't count (`Repo.starsCheck`, `Repository.githubStars`). */
  githubStars?: number | null;
  /** The stars from suspected fake accounts; GitHub's count less the honest one when not given. */
  notCounted?: number | null;
};

/**
 * A repository's stars: the honest count, and when some stars don't count, GitHub's count struck through before it
 * ("~~219~~ 13 stars"), with a hover that says why. The same order everywhere keeps right-aligned columns aligned.
 */
export const StarCount: FC<StarCountProps> = ({ stars: honest, githubStars, notCounted, format = 'full', ...rest }) => {
  const check = { githubStars, notCounted: notCounted ?? (githubStars ? githubStars - honest : null) };
  const struck = hasStarsNotCounted(check) ? check.githubStars : null;
  const hover = hasStarsNotCounted(check) ? repoStarsNotCountedText(check.notCounted, check.githubStars) : undefined;

  return (
    <StruckCount stars={honest} struck={struck} hover={hover} struckLabel="GitHub shows" format={format} {...rest} />
  );
};

export type StarTotalCountProps = StarCountBaseProps & {
  /** `User.starsNotCounted`, `Organization.starsNotCounted`: null while every star counts. */
  notCounted?: StarsNotCountedTotal | null;
};

/**
 * A developer's or an organization's total stars: the honest total, and when some stars don't count, the total with
 * them struck through before it, with a hover that says how many and on how many repositories.
 */
export const StarTotalCount: FC<StarTotalCountProps> = ({ stars: honest, notCounted, format = 'full', ...rest }) => {
  const struck = notCounted && notCounted.stars > 0 ? honest + notCounted.stars : null;
  const hover = struck && notCounted ? totalStarsNotCountedText(notCounted) : undefined;

  return (
    <StruckCount
      stars={honest}
      struck={struck}
      hover={hover}
      struckLabel="With the stars not counted,"
      format={format}
      {...rest}
    />
  );
};

type StarsNotCountedTagProps = {
  /** `Repo.starsCheck`. */
  check?: StarsCheck | null;
  className?: string;
};

/** "Stars not counted" beside a repository's tier chip, in `TagProvisional`'s grey, opening the same hover. */
export const StarsNotCountedTag: FC<StarsNotCountedTagProps> = ({ check, className }) => {
  if (!hasStarsNotCounted(check)) {
    return null;
  }

  return (
    <AdaptiveTooltip
      trigger={
        <button type="button" onClick={stopPropagation} className="cursor-help rounded-full">
          <Badge variant="secondary" className={className}>
            Stars not counted
          </Badge>
        </button>
      }
    >
      <p className="max-w-72">{repoStarsNotCountedText(check.notCounted, check.githubStars)}</p>
    </AdaptiveTooltip>
  );
};
