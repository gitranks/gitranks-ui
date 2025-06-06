export type LinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;
