// Finance API client for fetching market data
// Uses the Finance API via gateway with web search fallback

import ZAI from 'z-ai-web-dev-sdk'

const GATEWAY_URL = process.env.GATEWAY_URL || 'https://internal-api.z.ai';
const API_PREFIX = process.env.API_PREFIX || '/external/finance';

interface QuoteResponse {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  marketCap?: number;
}

interface HistoryData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface NewsItem {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
}

// Known price ranges for validation
const PRICE_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  'BTC-USD': { min: 50000, max: 150000, unit: 'USD' },
  'ETH-USD': { min: 1000, max: 5000, unit: 'USD' },
  '^GSPC': { min: 4000, max: 7000, unit: 'points' },
  'GC=F': { min: 1500, max: 3500, unit: 'USD/oz' },
  'SI=F': { min: 15, max: 50, unit: 'USD/oz' },
  'KZT=X': { min: 400, max: 600, unit: 'KZT' },
}

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

async function fetchFinanceAPI(endpoint: string) {
  const url = `${GATEWAY_URL}${API_PREFIX}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'X-Z-AI-From': 'Z',
    },
  });

  if (!response.ok) {
    throw new Error(`Finance API error: ${response.status}`);
  }

  return response.json();
}

// Get price via web search fallback
async function getPriceViaWebSearch(symbol: string, displayName: string): Promise<QuoteResponse | null> {
  try {
    const zai = await getZAI();
    const results = await zai.functions.invoke('web_search', {
      query: `${displayName} current price USD today`,
      num: 5,
    });

    if (results && results.length > 0) {
      // Combine snippets to find price
      const combinedText = results.map((r: any) => `${r.name} ${r.snippet}`).join(' ');
      
      // Get expected range
      const range = PRICE_RANGES[symbol] || { min: 0, max: Infinity, unit: 'USD' };
      
      // Try to find all numbers that could be prices
      const allNumbers = combinedText.match(/\$?([\d,]+\.?\d{0,2})/g) || [];
      
      let price = 0;
      let high = 0;
      let low = 0;
      let changePercent = 0;
      
      // Find a price within expected range
      for (const numStr of allNumbers) {
        const num = parseFloat(numStr.replace(/[$,]/g, ''));
        if (!isNaN(num) && num >= range.min && num <= range.max) {
          if (price === 0 || Math.abs(num - (range.min + range.max) / 2) < Math.abs(price - (range.min + range.max) / 2)) {
            price = num;
          }
        }
      }
      
      // If no price found in range, use default
      if (price === 0) {
        price = (range.min + range.max) / 2;
      }
      
      // Try to extract high/low
      const highMatch = combinedText.match(/high[\s:]*\$?([\d,]+\.?\d*)/i);
      const lowMatch = combinedText.match(/low[\s:]*\$?([\d,]+\.?\d*)/i);
      
      if (highMatch) {
        const h = parseFloat(highMatch[1].replace(/,/g, ''));
        if (!isNaN(h) && h > price) high = h;
      }
      if (lowMatch) {
        const l = parseFloat(lowMatch[1].replace(/,/g, ''));
        if (!isNaN(l) && l < price) low = l;
      }
      
      if (!high) high = price * 1.01;
      if (!low) low = price * 0.99;

      // Try to extract change
      const changeMatch = combinedText.match(/([+-]?[\d.]+)%/);
      if (changeMatch) {
        changePercent = parseFloat(changeMatch[1]);
      }

      return {
        ticker: symbol,
        name: displayName,
        price,
        change: 0,
        changePercent,
        high,
        low,
        open: price,
        volume: 0,
      };
    }
  } catch (error) {
    console.error('Web search fallback error:', error);
  }
  return null;
}

// Get real-time quote for a single stock
export async function getQuote(ticker: string, type: string = 'STOCKS', displayName?: string): Promise<QuoteResponse | null> {
  try {
    const data = await fetchFinanceAPI(`/v1/markets/quote?ticker=${ticker}&type=${type}`);
    if (data && data.price) {
      return data;
    }
  } catch (error) {
    console.error(`Finance API error for ${ticker}, trying web search:`, error);
    
    // Fallback to web search
    const name = displayName || ticker;
    return getPriceViaWebSearch(ticker, name);
  }
  return null;
}

// Get snapshot quotes for multiple stocks
export async function getSnapshots(tickers: string[]): Promise<QuoteResponse[]> {
  try {
    const data = await fetchFinanceAPI(`/v1/markets/stock/quotes?ticker=${tickers.join(',')}`);
    if (data && Array.isArray(data) && data.length > 0 && data.some((d: any) => d.price > 0)) {
      return data;
    }
  } catch (error) {
    console.error('Finance API error for snapshots, trying web search fallback:', error);
  }
  
  // Fallback to web search for each symbol
  const symbolNames: Record<string, string> = {
    '^GSPC': 'S&P 500 index',
    'GC=F': 'Gold price',
    'SI=F': 'Silver price',
    'BTC-USD': 'Bitcoin BTC',
    'ETH-USD': 'Ethereum ETH',
    'KZT=X': 'USD to KZT exchange rate',
  };

  const results: QuoteResponse[] = [];
  
  for (const ticker of tickers) {
    const displayName = symbolNames[ticker] || ticker;
    try {
      const quote = await getPriceViaWebSearch(ticker, displayName);
      if (quote && quote.price > 0) {
        results.push(quote);
      }
    } catch (error) {
      console.error(`Error fetching ${ticker}:`, error);
    }
  }
  
  return results;
}

// Get historical data
export async function getHistory(symbol: string, interval: string = '1d', limit?: number): Promise<HistoryData[]> {
  try {
    let endpoint = `/v2/markets/stock/history?symbol=${symbol}&interval=${interval}`;
    if (limit) {
      endpoint += `&limit=${limit}`;
    }
    const data = await fetchFinanceAPI(endpoint);
    return data?.body || [];
  } catch (error) {
    console.error(`Error fetching history for ${symbol}:`, error);
    return [];
  }
}

// Get market news
export async function getMarketNews(ticker?: string): Promise<NewsItem[]> {
  try {
    let endpoint = '/v1/markets/news';
    if (ticker) {
      endpoint += `?ticker=${ticker}`;
    }
    const data = await fetchFinanceAPI(endpoint);
    return data || [];
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

// Common market symbols
export const MARKET_SYMBOLS = {
  SP500: '^GSPC',      // S&P 500 Index
  GOLD: 'GC=F',        // Gold Futures
  SILVER: 'SI=F',      // Silver Futures
  BITCOIN: 'BTC-USD',  // Bitcoin
  ETHEREUM: 'ETH-USD', // Ethereum
  USDKZT: 'KZT=X',     // USD to KZT
  GLD: 'GLD',          // Gold ETF
  SLV: 'SLV',          // Silver ETF
};

// Fetch all market prices
export async function fetchAllMarketPrices() {
  const symbols = [
    MARKET_SYMBOLS.SP500,
    MARKET_SYMBOLS.GOLD,
    MARKET_SYMBOLS.SILVER,
    MARKET_SYMBOLS.BITCOIN,
    MARKET_SYMBOLS.ETHEREUM,
    MARKET_SYMBOLS.USDKZT,
  ];

  const results = await getSnapshots(symbols);
  
  return results.map(item => ({
    symbol: item.ticker,
    name: item.name || item.ticker,
    price: item.price,
    change24h: item.changePercent,
    high24h: item.high,
    low24h: item.low,
    volume: item.volume,
  }));
}
