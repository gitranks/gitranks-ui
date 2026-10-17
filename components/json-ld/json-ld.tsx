// Payloads carry user-controlled text (names, locations); escaping `<` keeps a `</script>` in
// that text from closing the tag early.
export const serializeJsonLd = (payload: unknown) => JSON.stringify(payload).replace(/</g, '\\u003c');

/** One `<script type="application/ld+json">` per payload; `null` payloads are skipped. */
export function JsonLd({ payloads }: Readonly<{ payloads: unknown[] }>) {
  return (
    <>
      {payloads
        .filter((obj) => obj != null)
        .map((obj, i) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(obj) }} />
        ))}
    </>
  );
}
