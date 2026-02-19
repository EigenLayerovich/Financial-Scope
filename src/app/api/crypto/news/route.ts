import { NextResponse } from 'next/server'
import { searchCryptoNews, SearchResult } from '@/lib/web-search'
import { db } from '@/lib/db'

export async function GET() {
  try {
    let news: Array<{
      title: string
      summary: string | null
      source: string | null
      url: string
      category: string
      publishedAt: string
    }> = []

    try {
      // Fetch fresh news from web search
      const searchResults = await searchCryptoNews(20)
      
      news = searchResults.map((item: SearchResult, index: number) => ({
        title: item.name || item.snippet?.slice(0, 100) || 'Untitled',
        summary: item.snippet || null,
        source: item.host_name || null,
        url: item.url,
        category: index < 10 ? 'news' : 'analysis',
        publishedAt: item.date || new Date().toISOString(),
      }))

      // Store in database for caching (only store new items)
      for (const item of news.slice(0, 15)) {
        try {
          await db.cryptoNews.upsert({
            where: { url: item.url },
            update: {
              title: item.title,
              summary: item.summary,
              source: item.source,
              category: item.category,
              publishedAt: new Date(item.publishedAt),
            },
            create: {
              title: item.title,
              summary: item.summary,
              source: item.source,
              url: item.url,
              category: item.category,
              publishedAt: new Date(item.publishedAt),
            },
          })
        } catch (dbError) {
          // Skip if duplicate or error
          console.error('DB error storing news:', dbError)
        }
      }
    } catch (searchError) {
      console.error('Web search error, falling back to cached news:', searchError)
      
      // Fallback to database cache
      const cachedNews = await db.cryptoNews.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 20,
      })
      
      news = cachedNews.map(n => ({
        title: n.title,
        summary: n.summary,
        source: n.source,
        url: n.url,
        category: n.category,
        publishedAt: n.publishedAt.toISOString(),
      }))
    }

    return NextResponse.json({ 
      news,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in crypto news API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch crypto news' },
      { status: 500 }
    )
  }
}
