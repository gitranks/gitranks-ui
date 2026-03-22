import { GoogleAnalytics } from '@next/third-parties/google';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Suspense, type ReactNode } from 'react';

import { CtaClickTracker } from './components/cta-click-tracker';
import { FlagEmojiPolyfill } from './components/flag-emoji-polyfill';
import { Announcement } from '@/components/announcement/announcement';
import { Footer } from '@/components/footer/footer';
import { ThemeProvider } from '@/components/theme-provider/theme-provider';
import { Toaster } from '@/components/ui/sonner';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GitRanks · GitHub Profile Analytics & Rankings',
  description:
    'Explore rankings based on stars, contributions, and followers. Dive into dynamic leaderboards to see how you rank against developers worldwide and within your own country.',
};

type RootLayoutProps = {
  children: ReactNode;
  modal: ReactNode;
};

export default function RootLayout({ children, modal }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://avatars.githubusercontent.com" crossOrigin="anonymous" />
      </head>
      <body
        className="antialiased"
        style={{ ...inter.style, fontFamily: `'Twemoji Country Flags', ${inter.style.fontFamily}` }}
      >
        <SessionProvider>
          <NuqsAdapter>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              <FlagEmojiPolyfill />
              <CtaClickTracker />
              <div className="flex flex-col min-h-screen">
                <div className="grow">
                  <Suspense fallback={null}>{children}</Suspense>
                </div>
                <Footer />
              </div>
              {modal}
              <Announcement />
              <Toaster richColors position="top-right" />
            </ThemeProvider>
          </NuqsAdapter>
        </SessionProvider>
      </body>
      <GoogleAnalytics gaId="G-YKY54NVEGK" />
    </html>
  );
}
