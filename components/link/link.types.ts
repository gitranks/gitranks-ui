export type LinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  /** @default false — opt in with `prefetch` on main nav links only */
  prefetch?: boolean;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;
