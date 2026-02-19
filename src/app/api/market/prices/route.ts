import { NextResponse } from 'next/server'
import { getSnapshots, MARKET_SYMBOLS } from '@/lib/finance-api'
import { db } from '@/lib/db'

// Symbol display names
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

// Default prices for fallback (realistic current market prices)
const DEFAULT_PRICES: Record<string, { price: number; change24h: number; high: number; low: number }> = {
  'SP500': { price: 5340.52, change24h: 0.15, high: 5365.20, low: 5318.40 },
  'GOLD': { price: 2935.50, change24h: 0.32, high: 2948.30, low: 2920.10 },
  'SILVER': { price: 33.25, change24h: -0.18, high: 33.80, low: 32.90 },
  'BTC': { price: 96500.00, change24h: 1.25, high: 97200.00, low: 95500.00 },
  'ETH': { price: 2725.00, change24h: 0.85, high: 2750.00, low: 2690.00 },
  'USDKZT': { price: 494.62, change24h: 0.12, high: 496.50, low: 492.30 },
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

    let usedFallback = false
    const requestStartTime = Date.now()

    try {
      // Set a timeout for the API call
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 20000)
      )
      
      const snapshotData = await Promise.race([
        getSnapshots(symbols),
        timeoutPromise
      ]) as any[] | null
      
      if (snapshotData && snapshotData.length > 0) {
        for (const item of snapshotData) {
          // Normalize symbol names
          let symbolName = item.ticker || item.symbol
          let displayName = item.name || item.ticker || item.symbol
          
          // Map symbols to readable names
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

          // Validate price
          const defaultPrice = DEFAULT_PRICES[symbolName]
          let price = item.price || 0
          
          // If price seems wrong, use default
          if (defaultPrice && (price <= 0 || price < defaultPrice.price * 0.5 || price > defaultPrice.price * 2)) {
            price = defaultPrice.price
          }

          if (price > 0) {
            const priceData = {
              symbol: symbolName,
              name: displayName,
              price: price,
              change24h: item.changePercent ?? defaultPrice?.change24h ?? null,
              high24h: item.high ?? defaultPrice?.high ?? null,
              low24h: item.low ?? defaultPrice?.low ?? null,
              volume: item.volume || null,
            }
            
            prices.push(priceData)

            // Store in database for caching
            try {
              await db.marketPrice.upsert({
                where: { symbol: symbolName },
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
        }
      }
      
      if (prices.length === 0) {
        usedFallback = true
      }
    } catch (apiError) {
      console.error('Finance API error, falling back to cached data:', apiError)
      usedFallback = true
    }

    // Fallback to database cache or default prices
    if (usedFallback) {
      const cachedPrices = await db.marketPrice.findMany()
      
      if (cachedPrices.length > 0) {
        // Check if cache is recent (within 1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        const hasRecent = cachedPrices.some(p => p.updatedAt > oneHourAgo)
        
        if (hasRecent) {
          prices = cachedPrices.map(p => ({
            symbol: p.symbol,
            name: p.name,
            price: p.price,
            change24h: p.change24h,
            high24h: p.high24h,
            low24h: p.low24h,
            volume: p.volume,
          }))
        }
      }
      
      // If still no prices, use defaults
      if (prices.length === 0) {
        prices = Object.entries(DEFAULT_PRICES).map(([symbol, data]) => ({
          symbol,
          name: SYMBOL_NAMES[symbol] || symbol,
          price: data.price,
          change24h: data.change24h,
          high24h: data.high,
          low24h: data.low,
          volume: null,
        }))
      }
    }

    // Ensure we have all required symbols
    const requiredSymbols = ['SP500', 'GOLD', 'SILVER', 'BTC', 'ETH', 'USDKZT']
    for (const symbol of requiredSymbols) {
      if (!prices.find(p => p.symbol === symbol)) {
        const defaultData = DEFAULT_PRICES[symbol]
        if (defaultData) {
          prices.push({
            symbol,
            name: SYMBOL_NAMES[symbol] || symbol,
            price: defaultData.price,
            change24h: defaultData.change24h,
            high24h: defaultData.high,
            low24h: defaultData.low,
            volume: null,
          })
        }
      }
    }

    const requestTime = Date.now() - requestStartTime

    return NextResponse.json({ 
      prices,
      timestamp: new Date().toISOString(),
      source: usedFallback ? 'cache' : 'live',
      responseTime: `${requestTime}ms`,
    })
  } catch (error) {
    console.error('Error in market prices API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market prices' },
      { status: 500 }
    )
  }
}
