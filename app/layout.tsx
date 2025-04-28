import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { Footer } from '@/components/footer/footer';
import { ThemeProvider } from '@/components/theme-provider/theme-provider';

import { PostHogProvider } from '../lib/posthog/post-hog-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GitRanks · Discover your developer superpower',
  description: 'GitHub profile ranks',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <SessionProvider>
          <PostHogProvider>
            <NuqsAdapter>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                <div className="flex flex-col min-h-screen">
                  <div className="flex-grow">{children}</div>
                  <Footer />
                </div>
              </ThemeProvider>
            </NuqsAdapter>
          </PostHogProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
