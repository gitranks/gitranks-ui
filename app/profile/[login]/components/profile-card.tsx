import { FC } from 'react';

import { Card, CardContent } from '@/components/ui/card';

type ProfileCardProps = {
  title: string;
  children: React.ReactNode;
};

export const ProfileCard: FC<ProfileCardProps> = ({ title, children }) => {
  return (
    <Card className="border-0 md:border-2 border-border p-0 md:p-4 min-w-xs flex-grow basis-0 shadow-none md:shadow-sm">
      <CardContent className="p-0 flex flex-col gap-1.5 md:gap-4">
        <h4 className="text-lg font-semibold">{title}</h4>
        <div className="flex flex-col gap-1.5">{children}</div>
      </CardContent>
    </Card>
  );
};
