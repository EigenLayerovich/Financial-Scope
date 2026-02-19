import { NextResponse } from 'next/server'
import { getSnapshots, MARKET_SYMBOLS, getHistory } from '@/lib/finance-api'
import { searchCryptoNews, searchCryptoPredictions, searchMarketAnalysis } from '@/lib/web-search'
import { db } from '@/lib/db'

export async function POST() {
  try {
    const results = {
      prices: false,
      news: false,
      analysis: false,
      history: false,
    }

    // 1. Refresh market prices
    try {
      const symbols = [
        MARKET_SYMBOLS.SP500,
        MARKET_SYMBOLS.GOLD,
        MARKET_SYMBOLS.SILVER,
        MARKET_SYMBOLS.BITCOIN,
        MARKET_SYMBOLS.ETHEREUM,
        MARKET_SYMBOLS.USDKZT,
      ]

      const snapshotData = await getSnapshots(symbols)
      
      for (const item of snapshotData) {
        let symbolName = item.ticker || item.symbol
        let displayName = item.name || item.ticker || item.symbol
        
        if (symbolName === '^GSPC') {
          displayName = 'S&P 500'
          symbolName = 'SP500'
        } else if (symbolName === 'GC=F') {
          displayName = 'Gold'
          symbolName = 'GOLD'
        } else if (symbolName === 'SI=F') {
          displayName = 'Silver'
          symbolName = 'SILVER'
        } else if (symbolName === 'BTC-USD') {
          displayName = 'Bitcoin'
          symbolName = 'BTC'
        } else if (symbolName === 'ETH-USD') {
          displayName = 'Ethereum'
          symbolName = 'ETH'
        } else if (symbolName === 'KZT=X') {
          displayName = 'USD/KZT'
          symbolName = 'USDKZT'
        }

        await db.marketPrice.upsert({
          where: { symbol: symbolName },
          update: {
            name: displayName,
            price: item.price || item.regularMarketPrice || 0,
            change24h: item.changePercent || item.regularMarketChangePercent || null,
            high24h: item.high || item.regularMarketDayHigh || null,
            low24h: item.low || item.regularMarketDayLow || null,
            volume: item.volume || item.regularMarketVolume || null,
            updatedAt: new Date(),
          },
          create: {
            symbol: symbolName,
            name: displayName,
            price: item.price || item.regularMarketPrice || 0,
            change24h: item.changePercent || item.regularMarketChangePercent || null,
            high24h: item.high || item.regularMarketDayHigh || null,
            low24h: item.low || item.regularMarketDayLow || null,
            volume: item.volume || item.regularMarketVolume || null,
          },
        })
      }
      
      results.prices = true
    } catch (error) {
      console.error('Error refreshing prices:', error)
    }

    // 2. Refresh crypto news
    try {
      const searchResults = await searchCryptoNews(20)
      
      for (const item of searchResults.slice(0, 15)) {
        try {
          await db.cryptoNews.upsert({
            where: { url: item.url },
            update: {
              title: item.name || item.snippet?.slice(0, 100) || 'Untitled',
              summary: item.snippet || null,
              source: item.host_name || null,
              category: 'news',
              publishedAt: new Date(item.date || new Date()),
            },
            create: {
              title: item.name || item.snippet?.slice(0, 100) || 'Untitled',
              summary: item.snippet || null,
              source: item.host_name || null,
              url: item.url,
              category: 'news',
              publishedAt: new Date(item.date || new Date()),
            },
          })
        } catch (dbError) {
          // Skip duplicates
        }
      }
      
      results.news = true
    } catch (error) {
      console.error('Error refreshing news:', error)
    }

    // 3. Refresh analysis and predictions
    try {
      const [predictions, analysisResults] = await Promise.all([
        searchCryptoPredictions(10),
        searchMarketAnalysis(10),
      ])

      const allItems = [
        ...predictions.map((item: any) => ({ ...item, type: 'prediction' })),
        ...analysisResults.map((item: any) => ({ ...item, type: 'analysis' })),
      ]

      for (const item of allItems.slice(0, 10)) {
        const text = (item.name + ' ' + (item.snippet || '')).toLowerCase()
        let sentiment: string | null = 'neutral'
        
        if (text.includes('bullish') || text.includes('surge') || text.includes('rally')) {
          sentiment = 'bullish'
        } else if (text.includes('bearish') || text.includes('drop') || text.includes('crash')) {
          sentiment = 'bearish'
        }

        let symbol = 'CRYPTO'
        if (text.includes('bitcoin') || text.includes('btc')) symbol = 'BTC'
        else if (text.includes('ethereum') || text.includes('eth')) symbol = 'ETH'

        try {
          await db.analysis.create({
            data: {
              symbol,
              type: item.type,
              title: item.name,
              content: item.snippet || 'Click to read more...',
              sentiment,
            },
          })
        } catch (dbError) {
          // Skip duplicates
        }
      }
      
      results.analysis = true
    } catch (error) {
      console.error('Error refreshing analysis:', error)
    }

    // 4. Store price history for charts
    try {
      const historySymbols = [
        { symbol: MARKET_SYMBOLS.BITCOIN, name: 'BTC' },
        { symbol: MARKET_SYMBOLS.ETHEREUM, name: 'ETH' },
        { symbol: MARKET_SYMBOLS.USDKZT, name: 'USDKZT' },
      ]

      for (const { symbol, name } of historySymbols) {
        const history = await getHistory(symbol, '1h', 24)
        
        for (const candle of history) {
          try {
            await db.priceHistory.create({
              data: {
                symbol: name,
                price: candle.close,
                high: candle.high,
                low: candle.low,
                volume: candle.volume,
                timestamp: new Date(candle.timestamp * 1000),
                interval: '1h',
              },
            })
          } catch (dbError) {
            // Skip duplicates
          }
        }
      }
      
      results.history = true
    } catch (error) {
      console.error('Error refreshing history:', error)
    }

    // Update last refresh time
    await db.appSetting.upsert({
      where: { key: 'lastRefresh' },
      update: { value: new Date().toISOString(), updatedAt: new Date() },
      create: { key: 'lastRefresh', value: new Date().toISOString() },
    })

    return NextResponse.json({ 
      success: true,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in refresh API:', error)
    return NextResponse.json(
      { error: 'Failed to refresh data' },
      { status: 500 }
    )
  }
}

// Also allow GET for easy testing
export async function GET() {
  return POST()
}
