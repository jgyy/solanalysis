# Solanalysis - Live Blockchain Analysis

Real-time Solana blockchain analytics dashboard by Jeffrey Goh.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Application

#### Option A: With Proxy Server (Recommended)
This bypasses CORS restrictions and provides better reliability:

```bash
# Start both proxy server and web server
npm start

# Or run them separately:
# Terminal 1 - Start proxy server (port 3001)
npm run proxy

# Terminal 2 - Start web server (port 8000)
npm run serve
```

Then open http://localhost:8000 in your browser.

#### Option B: Without Proxy Server
If you don't want to use the proxy server:

1. Edit `app.js` and change `USE_PROXY` to `false`:
```javascript
const USE_PROXY = false; // Set to false if not running proxy server
```

2. Start only the web server:
```bash
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

## Features

- **Real-time Network Stats**: Live TPS, block height, validator count
- **Live Transaction Feed**: Stream of recent transactions
- **Top Active Wallets**: Most active wallets on the network
- **Popular Tokens**: Most traded tokens
- **Network Activity**: Transaction volume and patterns
- **Biggest Transactions**: Largest value transfers

## Important: API Keys

For production use, you need to get your own RPC API keys. The current setup uses free public endpoints which have strict rate limits and may frequently fail.

**Recommended RPC Providers:**
1. **Helius** - https://helius.dev (Free tier: 100k credits/month)
2. **Alchemy** - https://www.alchemy.com (Free tier available) 
3. **QuickNode** - https://www.quicknode.com (Free tier available)
4. **GetBlock** - https://getblock.io (Free tier: 40k requests/day)

To use your own API key:
1. Sign up for a free account at one of the providers above
2. Get your API key
3. Update `proxy-server.js` with your endpoint:
```javascript
const RPC_ENDPOINTS = [
    'https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY_HERE',
    // ... other endpoints
];
```

## Troubleshooting

### Network Speed Shows 0
- Make sure the proxy server is running (`npm run proxy`)
- Check the browser console for errors
- The proxy server automatically switches between multiple RPC endpoints if one fails

### CORS Errors
- Use the proxy server (Option A) to bypass CORS restrictions
- The proxy server handles all RPC calls and price data fetching

### All RPC Endpoints Failing
- The public Solana RPC endpoints have rate limits
- The proxy server automatically rotates through multiple endpoints
- If all fail, wait a few minutes for rate limits to reset

## Architecture

- **Frontend**: Vanilla JavaScript with real-time updates
- **Proxy Server**: Node.js/Express server to bypass CORS and handle RPC failover
- **Data Sources**: Multiple Solana RPC endpoints with automatic failover
- **Price Data**: Multiple price API sources (Binance, CoinGecko, Coinbase)

## Project Structure

```
solanalysis/
├── index.html        # Main dashboard page
├── styles.css        # Global styles
├── app.js           # Main application logic
├── proxy-server.js  # Node.js proxy server for CORS bypass
├── package.json     # Project metadata and dependencies
├── LICENSE          # MIT License
└── README.md        # This file
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Jeffrey Goh**

## Acknowledgments

- Solana Foundation for the blockchain infrastructure
- Chart.js for visualization library
- CoinGecko for price data API