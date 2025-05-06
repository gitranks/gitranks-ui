export async function request(query: string, variables?: Record<string, unknown>) {
  const response = await fetch(process.env.GRAPHQL_URI!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.GRAPHQL_SECRET_KEY!,
      // Skip rate limit if custom header is present
      'nextjs-build-phase': String(process.env.NEXT_PHASE === 'phase-production-build'),
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL error! ${response.status}: ${response.statusText}`);
  }

  const res = await response.json();

  if (res.errors) {
    throw new Error(JSON.stringify(res.errors));
  }

  return { data: res.data, status: response.status };
}
