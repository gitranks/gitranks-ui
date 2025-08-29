import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { Footer } from '@/components/footer/footer';
import { ThemeProvider } from '@/components/theme-provider/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { PostHogClientOnlyProvider } from '@/lib/posthog/post-hog-client-only';

import { FlagEmojiPolyfill } from './components/flag-emoji-polyfill';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GitRanks · GitHub Profile Analytics & Rankings',
  description:
    'Explore rankings based on stars, contributions, and followers. Dive into dynamic leaderboards to see how you rank against developers worldwide and within your own country.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
        style={{ ...inter.style, fontFamily: `'Twemoji Country Flags', ${inter.style.fontFamily}` }}
      >
        <SessionProvider>
          <PostHogClientOnlyProvider>
            <NuqsAdapter>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                <FlagEmojiPolyfill />
                <div className="flex flex-col min-h-screen">
                  <div className="flex-grow">{children}</div>
                  <Footer />
                </div>
                <Toaster richColors position="top-right" />
              </ThemeProvider>
            </NuqsAdapter>
          </PostHogClientOnlyProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
