// Hourly data fetcher service
// This service fetches financial data every hour and stores it in the database

const REFRESH_INTERVAL = 60 * 60 * 1000 // 1 hour in milliseconds
const PORT = 3002

// Simple HTTP server for health checks
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)
    
    if (url.pathname === '/health') {
      return Response.json({ 
        status: 'ok', 
        service: 'data-fetcher',
        lastFetch: lastFetchTime,
        nextFetch: nextFetchTime,
      })
    }
    
    if (url.pathname === '/trigger') {
      // Manual trigger for testing
      await fetchData()
      return Response.json({ status: 'triggered', timestamp: new Date().toISOString() })
    }
    
    return Response.json({ error: 'Not found' }, { status: 404 })
  },
})

let lastFetchTime: string | null = null
let nextFetchTime: string | null = null

async function fetchData() {
  console.log(`[${new Date().toISOString()}] Starting data fetch...`)
  
  try {
    // Call the refresh API
    const response = await fetch(`http://localhost:3000/api/refresh`)
    const data = await response.json()
    
    lastFetchTime = new Date().toISOString()
    nextFetchTime = new Date(Date.now() + REFRESH_INTERVAL).toISOString()
    
    console.log(`[${new Date().toISOString()}] Data fetch completed:`, data.results)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Data fetch failed:`, error)
  }
}

// Initial fetch on startup
setTimeout(() => {
  fetchData()
}, 5000) // Wait 5 seconds for the main app to start

// Schedule hourly fetches
setInterval(fetchData, REFRESH_INTERVAL)

console.log(`Data fetcher service started on port ${PORT}`)
console.log(`Refresh interval: ${REFRESH_INTERVAL / 1000 / 60} minutes`)
