import type { PropsWithChildren } from 'react';

export const StepTitle = ({ children }: PropsWithChildren) => {
  return <div className="font-medium">{children}</div>;
};
