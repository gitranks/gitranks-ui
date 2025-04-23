export const Page = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return <main className="flex flex-col p-4 max-w-7xl mx-auto">{children}</main>;
};
