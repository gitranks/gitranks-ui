export const Footer = () => {
  return (
    <footer className="flex items-center justify-between p-4">
      <div className="flex items-center gap-2">
        <a href="https://github.com/gitranks/gitranks-ui" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
      </div>
      <p className="text-sm">
        Hand-coded with ❤️, bugs, and dreams ·{' '}
        <a href="https://github.com/maslianok" target="_blank" rel="noopener noreferrer">
          @maslianok
        </a>{' '}
        · 2025
      </p>
    </footer>
  );
};
