import Script from 'next/script';

// Public site token of the page-view beacon. Loaded by the app's own pages only, so responses the app did not
// render are not counted as visits. `spa` also counts client-side navigations.
const BEACON_CONFIG = JSON.stringify({ token: 'e520c328530c494d9e288ee84bbdd58e', spa: true });

export function WebAnalytics() {
  return (
    <Script
      src="https://static.cloudflareinsights.com/beacon.min.js"
      strategy="afterInteractive"
      data-cf-beacon={BEACON_CONFIG}
    />
  );
}
