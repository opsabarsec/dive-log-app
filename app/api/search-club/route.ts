import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to search for club website using DuckDuckGo
 * This server-side route fetches and parses DuckDuckGo HTML results
 * to extract the first search result URL
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  try {
    // Use DuckDuckGo HTML endpoint
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo returned status ${response.status}`);
    }

    const html = await response.text();

    // Parse HTML to extract first result
    // DuckDuckGo HTML results are in <a class="result__a"> tags
    const resultMatch = html.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"/);

    if (resultMatch && resultMatch[1]) {
      // The URL might be a DuckDuckGo redirect, extract the actual URL
      let url = resultMatch[1];

      // DuckDuckGo sometimes wraps URLs, try to extract the uddg parameter
      const uddgMatch = url.match(/uddg=([^&]+)/);
      if (uddgMatch && uddgMatch[1]) {
        url = decodeURIComponent(uddgMatch[1]);
      }

      // Clean up the URL
      url = url.replace(/^\/\//, 'https://');

      return NextResponse.json({
        url,
        query,
        success: true,
      });
    }

    // Try alternative pattern - sometimes results are in different format
    const altMatch = html.match(/class="result__url"[^>]*>([^<]+)</);
    if (altMatch && altMatch[1]) {
      let url = altMatch[1].trim();
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }

      return NextResponse.json({
        url,
        query,
        success: true,
      });
    }

    return NextResponse.json(
      { error: 'No results found', query },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error searching DuckDuckGo:', error);
    return NextResponse.json(
      {
        error: 'Failed to search DuckDuckGo',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
