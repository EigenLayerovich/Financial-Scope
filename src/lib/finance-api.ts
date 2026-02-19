// Finance API client for fetching market data
// Uses the Finance API via gateway

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

// Parse the API response body to extract quote data
function parseQuoteData(data: any): QuoteResponse {
  return {
    ticker: data.symbol || '',
    name: data.shortName || data.longName || data.symbol || '',
    price: data.regularMarketPrice || data.price || 0,
    change: data.regularMarketChange || data.change || 0,
    changePercent: data.regularMarketChangePercent || data.changePercent || 0,
    high: data.regularMarketDayHigh || data.high || 0,
    low: data.regularMarketDayLow || data.low || 0,
    open: data.regularMarketOpen || data.open || 0,
    volume: data.regularMarketVolume || data.volume || 0,
    marketCap: data.marketCap || undefined,
  };
}

// Get real-time quote for a single stock
export async function getQuote(ticker: string, type: string = 'STOCKS'): Promise<QuoteResponse | null> {
  try {
    const data = await fetchFinanceAPI(`/v1/markets/quote?ticker=${ticker}&type=${type}`);
    if (data && (data.regularMarketPrice || data.price)) {
      return parseQuoteData(data);
    }
  } catch (error) {
    console.error(`Error fetching quote for ${ticker}:`, error);
  }
  return null;
}

// Get snapshot quotes for multiple stocks
export async function getSnapshots(tickers: string[]): Promise<QuoteResponse[]> {
  try {
    const response = await fetchFinanceAPI(`/v1/markets/stock/quotes?ticker=${tickers.join(',')}`);
    
    // The API returns data in a 'body' array
    const body = response.body || response;
    
    if (Array.isArray(body) && body.length > 0) {
      return body.map((item: any) => parseQuoteData(item));
    }
  } catch (error) {
    console.error('Error fetching snapshots:', error);
  }
  return [];
}

// Get historical data
export async function getHistory(symbol: string, interval: string = '1d', limit?: number): Promise<HistoryData[]> {
  try {
    let endpoint = `/v2/markets/stock/history?symbol=${symbol}&interval=${interval}`;
    if (limit) {
      endpoint += `&limit=${limit}`;
    }
    const response = await fetchFinanceAPI(endpoint);
    return response?.body || [];
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
