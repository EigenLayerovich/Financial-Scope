# FinScope - Financial Intelligence Dashboard

## Project Overview

A comprehensive financial information application that provides:
- Real-time cryptocurrency news, analysis, and predictions
- Market prices for S&P 500, Gold, Silver, Bitcoin, Ethereum
- USD/KZT exchange rate
- Hourly automatic data refresh

## Architecture

### Database Schema (Prisma)
- `MarketPrice`: Stores current prices for all tracked assets
- `CryptoNews`: Stores cryptocurrency news articles
- `Analysis`: Stores market analysis and predictions
- `PriceHistory`: Historical price data for charts
- `AppSetting`: Application settings including last refresh time

### API Endpoints
- `GET /api/market/prices`: Fetches current market prices
- `GET /api/crypto/news`: Fetches cryptocurrency news
- `GET /api/crypto/analysis`: Fetches market analysis and predictions
- `GET /api/refresh`: Triggers data refresh (used by hourly service)

### Mini Services
- `data-fetcher`: Runs on port 3002, fetches data every hour

## Technology Stack
- Next.js 16 with App Router
- TypeScript
- Prisma ORM (SQLite)
- Tailwind CSS + shadcn/ui
- z-ai-web-dev-sdk for web search
- Finance API for market data

## Features
1. **Market Overview Cards**: Real-time prices for SP500, Gold, Silver, BTC, ETH, USD/KZT
2. **News Tab**: Latest cryptocurrency news with sources and timestamps
3. **Analysis Tab**: Expert analysis with sentiment indicators
4. **Predictions Tab**: Price predictions for major cryptocurrencies
5. **Auto-refresh**: Data refreshes every hour automatically
6. **Manual refresh**: Users can trigger data refresh manually
7. **Responsive Design**: Works on mobile and desktop

---
Task ID: 1
Agent: main
Task: Complete financial intelligence dashboard

Work Log:
- Created Prisma schema for financial data storage
- Built finance API client with web search fallback
- Created web search utility for cryptocurrency news
- Built market prices API endpoint with caching
- Built crypto news API endpoint
- Built analysis and predictions API endpoint
- Created hourly data fetching mini-service
- Built comprehensive dashboard UI with tabs and cards
- Implemented responsive design with shadcn/ui components

Stage Summary:
- Application is fully functional with all required features
- Data is fetched from Finance API with web search fallback
- Hourly refresh service is running on port 3002
- Frontend displays prices, news, analysis, and predictions
