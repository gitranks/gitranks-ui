export function JsonLd({ payloads }: { payloads: any[] }) {
  return (
    <>
      {payloads.map((obj, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }} />
      ))}
    </>
  );
}
