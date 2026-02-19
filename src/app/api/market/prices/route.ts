import { NextResponse } from 'next/server'
import { getSnapshots, MARKET_SYMBOLS } from '@/lib/finance-api'
import { db } from '@/lib/db'

// Symbol display names mapping
const SYMBOL_NAMES: Record<string, string> = {
  '^GSPC': 'S&P 500',
  'GC=F': 'Gold',
  'SI=F': 'Silver',
  'BTC-USD': 'Bitcoin',
  'ETH-USD': 'Ethereum',
  'KZT=X': 'USD/KZT',
  'SP500': 'S&P 500',
  'GOLD': 'Gold',
  'SILVER': 'Silver',
  'BTC': 'Bitcoin',
  'ETH': 'Ethereum',
  'USDKZT': 'USD/KZT',
}

// Map API symbols to display symbols
const SYMBOL_MAP: Record<string, string> = {
  '^GSPC': 'SP500',
  'GC=F': 'GOLD',
  'SI=F': 'SILVER',
  'BTC-USD': 'BTC',
  'ETH-USD': 'ETH',
  'KZT=X': 'USDKZT',
}

export async function GET() {
  try {
    const symbols = [
      MARKET_SYMBOLS.SP500,
      MARKET_SYMBOLS.GOLD,
      MARKET_SYMBOLS.SILVER,
      MARKET_SYMBOLS.BITCOIN,
      MARKET_SYMBOLS.ETHEREUM,
      MARKET_SYMBOLS.USDKZT,
    ]

    let prices: Array<{
      symbol: string
      name: string
      price: number
      change24h: number | null
      high24h: number | null
      low24h: number | null
      volume: number | null
    }> = []

    let dataSource = 'live'

    try {
      // Fetch data from Finance API with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      
      const snapshotData = await getSnapshots(symbols)
      clearTimeout(timeoutId)
      
      if (snapshotData && snapshotData.length > 0) {
        for (const item of snapshotData) {
          // Get the display symbol
          const displaySymbol = SYMBOL_MAP[item.ticker] || item.ticker
          const displayName = SYMBOL_NAMES[item.ticker] || item.name
          
          const priceData = {
            symbol: displaySymbol,
            name: displayName,
            price: item.price,
            change24h: item.changePercent,
            high24h: item.high,
            low24h: item.low,
            volume: item.volume,
          }
          
          prices.push(priceData)

          // Store in database for caching
          try {
            await db.marketPrice.upsert({
              where: { symbol: displaySymbol },
              update: {
                name: displayName,
                price: priceData.price,
                change24h: priceData.change24h,
                high24h: priceData.high24h,
                low24h: priceData.low24h,
                volume: priceData.volume,
                updatedAt: new Date(),
              },
              create: priceData,
            })
          } catch (dbError) {
            console.error('DB error:', dbError)
          }
        }
        
        console.log('Successfully fetched live prices:', prices.map(p => `${p.symbol}: ${p.price}`).join(', '))
      }
    } catch (apiError) {
      console.error('Finance API error, falling back to cached data:', apiError)
      dataSource = 'cache'
    }

    // Fallback to database cache if needed
    if (prices.length === 0) {
      const cachedPrices = await db.marketPrice.findMany()
      
      if (cachedPrices.length > 0) {
        prices = cachedPrices.map(p => ({
          symbol: p.symbol,
          name: p.name,
          price: p.price,
          change24h: p.change24h,
          high24h: p.high24h,
          low24h: p.low24h,
          volume: p.volume,
        }))
        dataSource = 'cache'
      }
    }

    // Ensure all required symbols are present
    const requiredSymbols = ['SP500', 'GOLD', 'SILVER', 'BTC', 'ETH', 'USDKZT']
    for (const symbol of requiredSymbols) {
      if (!prices.find(p => p.symbol === symbol)) {
        console.warn(`Missing price for ${symbol}`)
      }
    }

    return NextResponse.json({ 
      prices,
      timestamp: new Date().toISOString(),
      source: dataSource,
    })
  } catch (error) {
    console.error('Error in market prices API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market prices' },
      { status: 500 }
    )
  }
}
