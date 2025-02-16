import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { query, variables } = await req.json();

    const graphqlRes = await fetch(process.env.GRAPHQL_URI!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.GRAPHQL_SECRET_KEY!,
      },
      body: JSON.stringify({ query, variables }),
    });

    // Stream or parse the response back to the client
    const data = await graphqlRes.json();
    return NextResponse.json(data, { status: graphqlRes.status });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
