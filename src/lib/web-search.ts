// Web search utility for fetching cryptocurrency news and analysis
import ZAI from 'z-ai-web-dev-sdk';

export interface SearchResult {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  rank: number;
  date: string;
  favicon: string;
}

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// Search the web for information
export async function searchWeb(query: string, num: number = 10): Promise<SearchResult[]> {
  try {
    const zai = await getZAI();
    const results = await zai.functions.invoke('web_search', {
      query,
      num,
    });
    return results || [];
  } catch (error) {
    console.error('Error searching web:', error);
    return [];
  }
}

// Search for cryptocurrency news
export async function searchCryptoNews(num: number = 15): Promise<SearchResult[]> {
  const queries = [
    'cryptocurrency news today',
    'bitcoin ethereum latest news',
    'crypto market analysis',
  ];

  const allResults: SearchResult[] = [];
  
  for (const query of queries) {
    const results = await searchWeb(query, Math.ceil(num / queries.length));
    allResults.push(...results);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = allResults.filter(item => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  // Sort by date (most recent first)
  return unique
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, num);
}

// Search for crypto price predictions
export async function searchCryptoPredictions(num: number = 10): Promise<SearchResult[]> {
  const queries = [
    'bitcoin price prediction 2025',
    'ethereum price forecast',
    'cryptocurrency analysis today',
  ];

  const allResults: SearchResult[] = [];
  
  for (const query of queries) {
    const results = await searchWeb(query, Math.ceil(num / queries.length));
    allResults.push(...results);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = allResults.filter(item => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  return unique.slice(0, num);
}

// Search for market analysis
export async function searchMarketAnalysis(num: number = 10): Promise<SearchResult[]> {
  return searchWeb('cryptocurrency market analysis technical analysis', num);
}

// Search for specific crypto news
export async function searchSpecificCrypto(coin: string, num: number = 10): Promise<SearchResult[]> {
  return searchWeb(`${coin} cryptocurrency news analysis`, num);
}

// USD/KZT exchange rate search
export async function searchUSDKZTRate(): Promise<SearchResult[]> {
  return searchWeb('USD KZT exchange rate today Kazakhstan tenge', 5);
}
