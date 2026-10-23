import { GoogleAnalytics } from '@next/third-parties/google';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { type ReactNode, Suspense } from 'react';

import { CtaClickTracker } from './components/cta-click-tracker';
import { FlagEmojiPolyfill } from './components/flag-emoji-polyfill';
import { Announcement } from '@/components/announcement/announcement';
import { Footer } from '@/components/footer/footer';
import { JsonLd } from '@/components/json-ld/json-ld';
import { NavigationProgress } from '@/components/navigation-progress/navigation-progress';
import { SessionProvider } from '@/components/session-provider/session-provider';
import { ThemeProvider } from '@/components/theme-provider/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { buildSiteJsonLd } from '@/lib/seo/json-ld';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_X_HANDLE } from '@/lib/seo/site';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

const metadataBase = process.env.NEXT_PUBLIC_URI ? new URL(process.env.NEXT_PUBLIC_URI) : undefined;

// No `alternates` here: children without their own would inherit the home page canonical.
export const metadata: Metadata = {
  metadataBase,
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary',
    site: SITE_X_HANDLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
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
        <JsonLd payloads={buildSiteJsonLd()} />
        <SessionProvider>
          <NuqsAdapter>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              <NavigationProgress />
              <FlagEmojiPolyfill />
              <CtaClickTracker />
              <div className="flex flex-col min-h-screen">
                {/* No Suspense around the page: React streams a large finished boundary into a hidden
                    segment after the footer, and a fallback here would also turn every notFound()
                    into a 200. Routes that need a fallback add their own boundary. */}
                <div className="grow">{children}</div>
                <Footer />
              </div>
              <Suspense fallback={null}>{modal}</Suspense>
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
