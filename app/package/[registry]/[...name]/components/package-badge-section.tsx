import type { FC } from 'react';

export type PackageBadgeSectionProps = {
  /** The package's name: `x` or `@scope/x`. */
  name: string;
};

/** The package's badges on its page: three promoted shields and the first one's code. Draws nothing yet. */
export const PackageBadgeSection: FC<PackageBadgeSectionProps> = () => null;
