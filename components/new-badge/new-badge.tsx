import { FlameIcon } from 'lucide-react';

import { Badge } from '../ui/badge';

export const NewBadge = () => {
  return (
    <Badge variant="secondary" className="bg-primary text-primary-foreground">
      <FlameIcon />
      NEW
    </Badge>
  );
};
