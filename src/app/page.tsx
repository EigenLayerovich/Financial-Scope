'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Bitcoin, 
  Coins, 
  LineChart, 
  Newspaper,
  Clock,
  DollarSign,
  BarChart3,
  AlertCircle
} from 'lucide-react'

// Types
interface MarketPrice {
  symbol: string
  name: string
  price: number
  change24h: number | null
  high24h: number | null
  low24h: number | null
  volume: number | null
}

interface NewsItem {
  title: string
  summary: string | null
  source: string | null
  url: string
  category: string
  publishedAt: string
}

interface AnalysisItem {
  id: string
  symbol: string
  type: string
  title: string
  content: string
  sentiment: string | null
  createdAt: string
}

interface PriceData {
  timestamp: string
  price: number
}

// Format price with appropriate decimals
function formatPrice(price: number | null, symbol: string): string {
  if (price === null || price === undefined) return 'N/A'
  
  if (symbol === 'USDKZT' || symbol === 'KZT=X') {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (symbol.includes('BTC') || symbol.includes('BTC-USD')) {
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (symbol.includes('ETH') || symbol.includes('ETH-USD')) {
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (symbol.includes('GSPC') || symbol === '^GSPC' || symbol === 'SP500') {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  
  return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Format percentage change
function formatChange(change: number | null): { text: string; isPositive: boolean } {
  if (change === null || change === undefined) {
    return { text: 'N/A', isPositive: false }
  }
  return {
    text: `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`,
    isPositive: change >= 0
  }
}

// Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Format time ago
function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function Dashboard() {
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([])
  const [cryptoNews, setCryptoNews] = useState<NewsItem[]>([])
  const [analysis, setAnalysis] = useState<AnalysisItem[]>([])
  const [priceHistory, setPriceHistory] = useState<Record<string, PriceData[]>>({})
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all data
  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const [pricesRes, newsRes, analysisRes] = await Promise.all([
        fetch('/api/market/prices'),
        fetch('/api/crypto/news'),
        fetch('/api/crypto/analysis')
      ])

      if (pricesRes.ok) {
        const pricesData = await pricesRes.json()
        setMarketPrices(pricesData.prices || [])
      }

      if (newsRes.ok) {
        const newsData = await newsRes.json()
        setCryptoNews(newsData.news || [])
      }

      if (analysisRes.ok) {
        const analysisData = await analysisRes.json()
        setAnalysis(analysisData.analysis || [])
      }

      setLastUpdate(new Date())
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to fetch data. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchData(true)
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  // Get specific market prices
  const getPrice = (symbols: string[]): MarketPrice | undefined => {
    return marketPrices.find(p => symbols.includes(p.symbol))
  }

  const sp500 = getPrice(['^GSPC', 'SP500'])
  const gold = getPrice(['GC=F', 'GOLD', 'GLD'])
  const silver = getPrice(['SI=F', 'SILVER', 'SLV'])
  const bitcoin = getPrice(['BTC-USD', 'BTC', 'BITCOIN'])
  const ethereum = getPrice(['ETH-USD', 'ETH', 'ETHEREUM'])
  const usdKzt = getPrice(['KZT=X', 'USDKZT'])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md dark:bg-slate-900/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">FinScope</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Markets & Crypto Intelligence</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {lastUpdate && (
                <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Clock className="w-4 h-4" />
                  Updated {timeAgo(lastUpdate.toISOString())}
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchData(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}

        {/* Market Overview Cards */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <LineChart className="w-5 h-5" />
            Market Overview
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* S&P 500 */}
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">S&P 500</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {formatPrice(sp500?.price || null, 'SP500')}
                    </div>
                    {sp500?.change24h !== null && sp500?.change24h !== undefined && (
                      <div className={`flex items-center gap-1 text-sm mt-1 ${
                        sp500.change24h >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {sp500.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {formatChange(sp500.change24h).text}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
            </Card>

            {/* Gold */}
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Gold</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {formatPrice(gold?.price || null, 'GOLD')}
                    </div>
                    {gold?.change24h !== null && gold?.change24h !== undefined && (
                      <div className={`flex items-center gap-1 text-sm mt-1 ${
                        gold.change24h >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {gold.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {formatChange(gold.change24h).text}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-500/10 to-transparent rounded-bl-full" />
            </Card>

            {/* Silver */}
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider">Silver</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {formatPrice(silver?.price || null, 'SILVER')}
                    </div>
                    {silver?.change24h !== null && silver?.change24h !== undefined && (
                      <div className={`flex items-center gap-1 text-sm mt-1 ${
                        silver.change24h >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {silver.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {formatChange(silver.change24h).text}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-slate-400/10 to-transparent rounded-bl-full" />
            </Card>

            {/* Bitcoin */}
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider flex items-center gap-1">
                  <Bitcoin className="w-3 h-3" /> Bitcoin
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {formatPrice(bitcoin?.price || null, 'BTC')}
                    </div>
                    {bitcoin?.change24h !== null && bitcoin?.change24h !== undefined && (
                      <div className={`flex items-center gap-1 text-sm mt-1 ${
                        bitcoin.change24h >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {bitcoin.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {formatChange(bitcoin.change24h).text}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-orange-500/10 to-transparent rounded-bl-full" />
            </Card>

            {/* Ethereum */}
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider flex items-center gap-1">
                  <Coins className="w-3 h-3" /> Ethereum
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {formatPrice(ethereum?.price || null, 'ETH')}
                    </div>
                    {ethereum?.change24h !== null && ethereum?.change24h !== undefined && (
                      <div className={`flex items-center gap-1 text-sm mt-1 ${
                        ethereum.change24h >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {ethereum.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {formatChange(ethereum.change24h).text}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full" />
            </Card>

            {/* USD/KZT */}
            <Card className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> USD/KZT
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {formatPrice(usdKzt?.price || null, 'KZT=X')}
                    </div>
                    {usdKzt?.change24h !== null && usdKzt?.change24h !== undefined && (
                      <div className={`flex items-center gap-1 text-sm mt-1 ${
                        usdKzt.change24h >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {usdKzt.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {formatChange(usdKzt.change24h).text}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-teal-500/10 to-transparent rounded-bl-full" />
            </Card>
          </div>
        </section>

        {/* Main Content Tabs */}
        <Tabs defaultValue="news" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
            <TabsTrigger value="news" className="flex items-center gap-2">
              <Newspaper className="w-4 h-4" />
              News
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <LineChart className="w-4 h-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="predictions" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Predictions
            </TabsTrigger>
          </TabsList>

          {/* News Tab */}
          <TabsContent value="news">
            <Card>
              <CardHeader>
                <CardTitle>Cryptocurrency News</CardTitle>
                <CardDescription>Latest updates from the crypto world, refreshed hourly</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    ))}
                  </div>
                ) : cryptoNews.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No news available. Click refresh to fetch latest news.
                  </div>
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-4">
                      {cryptoNews.map((news, index) => (
                        <a
                          key={index}
                          href={news.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-4 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <h3 className="font-medium text-slate-900 dark:text-white mb-1 line-clamp-2">
                            {news.title}
                          </h3>
                          {news.summary && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                              {news.summary}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            {news.source && (
                              <Badge variant="secondary" className="text-xs">
                                {news.source}
                              </Badge>
                            )}
                            <span>{formatDate(news.publishedAt)}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {news.category}
                            </Badge>
                          </div>
                        </a>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle>Market Analysis</CardTitle>
                <CardDescription>Expert analysis and insights on cryptocurrency markets</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ))}
                  </div>
                ) : analysis.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    No analysis available. Click refresh to fetch latest analysis.
                  </div>
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-6">
                      {analysis.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-lg border"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-slate-900 dark:text-white">
                              {item.title}
                            </h3>
                            {item.sentiment && (
                              <Badge 
                                variant={
                                  item.sentiment === 'bullish' ? 'default' : 
                                  item.sentiment === 'bearish' ? 'destructive' : 
                                  'secondary'
                                }
                                className="capitalize"
                              >
                                {item.sentiment}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                            {item.content}
                          </p>
                          <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                            <Badge variant="outline" className="text-xs uppercase">
                              {item.symbol}
                            </Badge>
                            <span>{formatDate(item.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions">
            <Card>
              <CardHeader>
                <CardTitle>Price Predictions</CardTitle>
                <CardDescription>AI-powered and expert predictions for cryptocurrency prices</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="space-y-4">
                      {analysis
                        .filter(a => a.type === 'prediction')
                        .map((item) => (
                          <div
                            key={item.id}
                            className="p-4 rounded-lg border bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-medium text-slate-900 dark:text-white">
                                {item.title}
                              </h3>
                              {item.sentiment && (
                                <Badge 
                                  variant={
                                    item.sentiment === 'bullish' ? 'default' : 
                                    item.sentiment === 'bearish' ? 'destructive' : 
                                    'secondary'
                                  }
                                  className="capitalize"
                                >
                                  {item.sentiment}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {item.content}
                            </p>
                            <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                              <Badge variant="outline" className="text-xs uppercase">
                                {item.symbol}
                              </Badge>
                              <span>{formatDate(item.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      {analysis.filter(a => a.type === 'prediction').length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                          No predictions available. Check back later for updates.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Stats */}
        <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bitcoin Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bitcoin className="w-5 h-5 text-orange-500" />
                Bitcoin Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">24h High</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {formatPrice(bitcoin?.high24h || null, 'BTC')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">24h Low</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {formatPrice(bitcoin?.low24h || null, 'BTC')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Volume</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {bitcoin?.volume ? `${(bitcoin.volume / 1e9).toFixed(2)}B` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Change 24h</p>
                  <p className={`text-lg font-semibold ${
                    (bitcoin?.change24h || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {formatChange(bitcoin?.change24h || null).text}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ethereum Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-purple-500" />
                Ethereum Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">24h High</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {formatPrice(ethereum?.high24h || null, 'ETH')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">24h Low</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {formatPrice(ethereum?.low24h || null, 'ETH')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Volume</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {ethereum?.volume ? `${(ethereum.volume / 1e9).toFixed(2)}B` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Change 24h</p>
                  <p className={`text-lg font-semibold ${
                    (ethereum?.change24h || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {formatChange(ethereum?.change24h || null).text}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-white/80 backdrop-blur-md dark:bg-slate-900/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
            <p>FinScope - Real-time Market Intelligence</p>
            <p>Data refreshes every hour automatically</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
