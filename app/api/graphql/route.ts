import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    const origin = req.headers.get('origin') || req.headers.get('referer');
    const host = req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const expectedOrigin = `${protocol}://${host}`;

    console.log('origin', origin, expectedOrigin);

    //   if (!origin || !origin.startsWith(expectedOrigin)) {
    //     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    //   }
  }

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
