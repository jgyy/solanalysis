const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));

const RPC_ENDPOINTS = [
    'https://mainnet.helius-rpc.com/?api-key=2e0b1f65-e2d9-4a7f-b25f-ce8d2e3f8e2a',
    'https://api.mainnet-beta.solana.com',
    'https://solana-mainnet.rpc.extrnode.com',
    'https://mainnet.block-engine.jito.wtf/api/v1/shred',
    'https://rpc.ankr.com/solana'
];

let currentEndpointIndex = 0;

app.post('/solana-rpc', async (req, res) => {
    let lastError = null;
    const method = req.body?.method || 'unknown';
    
    const startIndex = 0;
    
    for (let i = startIndex; i < RPC_ENDPOINTS.length; i++) {
        const endpoint = RPC_ENDPOINTS[(currentEndpointIndex + i) % RPC_ENDPOINTS.length];
        
        try {
            console.log(`Trying ${method} on ${endpoint}`);
            const response = await axios.post(endpoint, req.body, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            if (response.data && !response.data.error) {
                console.log(`Success with ${endpoint} for ${method}`);
                res.json(response.data);
                return;
            } else if (response.data?.error) {
                console.log(`RPC error from ${endpoint}: ${JSON.stringify(response.data.error)}`);
                lastError = new Error(response.data.error.message || 'RPC error');
            }
        } catch (error) {
            lastError = error;
            const errorMsg = error.response?.data?.error?.message || error.message;
            console.log(`Failed ${method} with ${endpoint}: ${errorMsg}`);
            
            if (error.response && (error.response.status === 429 || error.response.status === 403)) {
                currentEndpointIndex = (currentEndpointIndex + 1) % RPC_ENDPOINTS.length;
            }
        }
    }
    
    console.error(`All endpoints failed for ${method}`);
    
    res.status(500).json({ 
        error: 'All RPC endpoints failed', 
        details: lastError?.message,
        method: method
    });
});

app.get('/price/solana/:currency?', async (req, res) => {
    const currency = (req.params.currency || 'USD').toUpperCase();
    
    try {
        const sources = [
            async () => {
                const currencyLower = currency.toLowerCase();
                const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=${currencyLower}`);
                return { 
                    price: response.data.solana[currencyLower],
                    currency: currency
                };
            },
            async () => {
                const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT');
                const usdPrice = parseFloat(response.data.price);
                
                if (currency === 'USD') {
                    return { price: usdPrice, currency: 'USD' };
                }
                
                const ratesResponse = await axios.get(`https://api.exchangerate-api.com/v4/latest/USD`);
                const rate = ratesResponse.data.rates[currency] || 1;
                return { 
                    price: usdPrice * rate,
                    currency: currency
                };
            },
            async () => {
                const response = await axios.get('https://api.coinbase.com/v2/exchange-rates?currency=SOL');
                const price = parseFloat(response.data.data.rates[currency] || response.data.data.rates.USD);
                return { price: price, currency: currency };
            }
        ];
        
        for (const source of sources) {
            try {
                const data = await source();
                res.json(data);
                return;
            } catch (error) {
                console.log('Price source failed:', error.message);
            }
        }
        
        res.json({ price: 0, currency: currency });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch price' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Serving website at http://localhost:${PORT}`);
    console.log('Proxy endpoints available at /solana-rpc and /price/solana/:currency');
});
