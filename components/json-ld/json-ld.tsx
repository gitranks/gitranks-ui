export function JsonLd({ payloads }: Readonly<{ payloads: unknown[] }>) {
  return (
    <>
      {payloads.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
    </>
  );
}
