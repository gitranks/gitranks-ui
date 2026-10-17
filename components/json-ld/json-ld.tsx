// Payloads carry user-controlled text (names, locations); escaping `<` keeps a `</script>` in
// that text from closing the tag early.
const serialize = (payload: unknown) => JSON.stringify(payload).replace(/</g, '\\u003c');

export function JsonLd({ payloads }: Readonly<{ payloads: unknown[] }>) {
  return (
    <>
      {payloads.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialize(obj) }} />
      ))}
    </>
  );
}
