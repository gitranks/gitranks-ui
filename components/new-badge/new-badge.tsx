import { FlameIcon } from 'lucide-react';

import { Badge } from '../ui/badge';

export const NewBadge = () => {
  return (
    <Badge variant="secondary" className="bg-blue-500 text-white dark:bg-blue-600">
      <FlameIcon />
      NEW
    </Badge>
  );
};
