export const PageBlock = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return <div className="flex flex-row gap-4 grow items-center">{children}</div>;
};
