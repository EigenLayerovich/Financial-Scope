import { NextResponse } from 'next/server'
import { searchCryptoPredictions, searchMarketAnalysis, SearchResult } from '@/lib/web-search'
import { db } from '@/lib/db'

export async function GET() {
  try {
    let analysis: Array<{
      id: string
      symbol: string
      type: string
      title: string
      content: string
      sentiment: string | null
      createdAt: string
    }> = []

    try {
      // Fetch predictions and analysis
      const [predictions, analysisResults] = await Promise.all([
        searchCryptoPredictions(10),
        searchMarketAnalysis(10),
      ])

      // Process predictions
      const predictionItems = predictions.map((item: SearchResult) => {
        // Detect sentiment from content
        const text = (item.name + ' ' + (item.snippet || '')).toLowerCase()
        let sentiment: string | null = null
        
        if (text.includes('bullish') || text.includes('surge') || text.includes('rally') || text.includes('increase')) {
          sentiment = 'bullish'
        } else if (text.includes('bearish') || text.includes('drop') || text.includes('crash') || text.includes('decline')) {
          sentiment = 'bearish'
        } else {
          sentiment = 'neutral'
        }

        // Detect symbol
        let symbol = 'CRYPTO'
        if (text.includes('bitcoin') || text.includes('btc')) {
          symbol = 'BTC'
        } else if (text.includes('ethereum') || text.includes('eth')) {
          symbol = 'ETH'
        } else if (text.includes('solana') || text.includes('sol')) {
          symbol = 'SOL'
        }

        return {
          id: `pred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          type: 'prediction',
          title: item.name,
          content: item.snippet || 'Click to read more...',
          sentiment,
          createdAt: item.date || new Date().toISOString(),
        }
      })

      // Process analysis
      const analysisItems = analysisResults.map((item: SearchResult) => {
        const text = (item.name + ' ' + (item.snippet || '')).toLowerCase()
        let sentiment: string | null = null
        
        if (text.includes('bullish') || text.includes('positive') || text.includes('growth')) {
          sentiment = 'bullish'
        } else if (text.includes('bearish') || text.includes('negative') || text.includes('risk')) {
          sentiment = 'bearish'
        } else {
          sentiment = 'neutral'
        }

        let symbol = 'CRYPTO'
        if (text.includes('bitcoin') || text.includes('btc')) {
          symbol = 'BTC'
        } else if (text.includes('ethereum') || text.includes('eth')) {
          symbol = 'ETH'
        }

        return {
          id: `anal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          symbol,
          type: 'analysis',
          title: item.name,
          content: item.snippet || 'Click to read more...',
          sentiment,
          createdAt: item.date || new Date().toISOString(),
        }
      })

      analysis = [...predictionItems, ...analysisItems]

      // Store in database
      for (const item of analysis.slice(0, 10)) {
        try {
          await db.analysis.create({
            data: {
              symbol: item.symbol,
              type: item.type,
              title: item.title,
              content: item.content,
              sentiment: item.sentiment,
            },
          })
        } catch (dbError) {
          console.error('DB error storing analysis:', dbError)
        }
      }
    } catch (searchError) {
      console.error('Web search error, falling back to cached analysis:', searchError)
      
      // Fallback to database cache
      const cachedAnalysis = await db.analysis.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
      
      analysis = cachedAnalysis.map(a => ({
        id: a.id,
        symbol: a.symbol,
        type: a.type,
        title: a.title,
        content: a.content,
        sentiment: a.sentiment,
        createdAt: a.createdAt.toISOString(),
      }))
    }

    return NextResponse.json({ 
      analysis,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in crypto analysis API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch crypto analysis' },
      { status: 500 }
    )
  }
}
