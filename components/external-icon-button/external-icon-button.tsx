import { ExternalLink } from 'lucide-react';
import type { FC, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type ExternalIconButtonProps = {
  href: string;
  /** "Open on GitHub": the button's name, and its tooltip. */
  label: string;
  /** The site's own mark, from react-icons. */
  icon: ReactNode;
};

/** A left column's link out: the site's mark and an arrow, named by its tooltip and `aria-label`. */
export const ExternalIconButton: FC<ExternalIconButtonProps> = ({ href, label, icon }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button size="sm" variant="outline" asChild>
        <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
          {icon}
          <ExternalLink className="size-4 text-muted-foreground" aria-hidden />
        </a>
      </Button>
    </TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);
