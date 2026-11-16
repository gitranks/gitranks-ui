import Script from 'next/script';

// Public site token of the page-view beacon. Loaded by the app's own pages only, so responses the app did not
// render are not counted as visits. Client-side navigations are counted by default.
const BEACON_CONFIG = JSON.stringify({ token: 'e520c328530c494d9e288ee84bbdd58e' });

export function WebAnalytics() {
  return (
    <Script
      src="https://static.cloudflareinsights.com/beacon.min.js"
      type="module"
      strategy="afterInteractive"
      data-cf-beacon={BEACON_CONFIG}
    />
  );
}
