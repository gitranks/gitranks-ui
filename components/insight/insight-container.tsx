import { Card, CardContent } from '../ui/card';

export const InsightContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <Card className="py-4">
      <CardContent>{children}</CardContent>
    </Card>
  );
};
