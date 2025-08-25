import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import axios, { AxiosError } from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

interface AnalyticsCache {
    tpsHistory: { time: string; value: number }[];
    priceHistory: { time: string; value: number }[];
    txTypeStats: { [key: string]: number };
    activityData: { time: string; value: number }[];
    blockTimeData: { time: string; value: number }[];
    feeData: { time: string; avg: number; max: number }[];
    networkStats: {
        tps: number;
        blockHeight: number;
        solPrice: number;
        validators: number;
        peakTps: number;
        hourlyTransactions: number;
        totalAnalyzed: number;
    };
    bigTransactions: {
        amount: number;
        signature: string;
        type: string;
        timestamp: number;
        blockTime?: number;
    }[];
    lastUpdated: number;
}

let analyticsCache: AnalyticsCache = {
    tpsHistory: [],
    priceHistory: [],
    txTypeStats: {
        Transfer: 0,
        Swap: 0,
        NFT: 0,
        Token: 0,
        DeFi: 0,
        Stake: 0,
        Vote: 0,
        Other: 0
    },
    activityData: [],
    blockTimeData: [],
    feeData: [],
    networkStats: {
        tps: 0,
        blockHeight: 0,
        solPrice: 0,
        validators: 0,
        peakTps: 0,
        hourlyTransactions: 0,
        totalAnalyzed: 0
    },
    bigTransactions: [],
    lastUpdated: Date.now()
};

const MAX_DATA_POINTS = 60;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

app.use(cors({
    origin: [
        'http://localhost',
        'http://localhost:80',
        'http://localhost:3000', 
        'http://localhost:5000', 
        'http://127.0.0.1:5000',
        'http://frontend',
        'http://frontend:80'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/analytics/cache', (_req: Request, res: Response) => {
    const now = Date.now();
    if (now - analyticsCache.lastUpdated > CACHE_DURATION) {
        analyticsCache = {
            tpsHistory: [],
            priceHistory: [],
            txTypeStats: {
                Transfer: 0,
                Swap: 0,
                NFT: 0,
                Token: 0,
                DeFi: 0,
                Stake: 0,
                Vote: 0,
                Other: 0
            },
            activityData: [],
            blockTimeData: [],
            feeData: [],
            networkStats: {
                tps: 0,
                blockHeight: 0,
                solPrice: 0,
                validators: 0,
                peakTps: 0,
                hourlyTransactions: 0,
                totalAnalyzed: 0
            },
            bigTransactions: [],
            lastUpdated: now
        };
    }
    res.json(analyticsCache);
});

app.post('/analytics/cache', (req: Request, res: Response) => {
    const updates = req.body;
    
    if (updates.tpsHistory) {
        analyticsCache.tpsHistory = updates.tpsHistory;
        if (analyticsCache.tpsHistory.length > MAX_DATA_POINTS) {
            analyticsCache.tpsHistory = analyticsCache.tpsHistory.slice(-MAX_DATA_POINTS);
        }
    }
    
    if (updates.priceHistory) {
        analyticsCache.priceHistory = updates.priceHistory;
        if (analyticsCache.priceHistory.length > MAX_DATA_POINTS) {
            analyticsCache.priceHistory = analyticsCache.priceHistory.slice(-MAX_DATA_POINTS);
        }
    }
    
    if (updates.txTypeStats) {
        analyticsCache.txTypeStats = updates.txTypeStats;
    }
    
    if (updates.activityData) {
        analyticsCache.activityData = updates.activityData;
        if (analyticsCache.activityData.length > 24) {
            analyticsCache.activityData = analyticsCache.activityData.slice(-24);
        }
    }
    
    if (updates.blockTimeData) {
        analyticsCache.blockTimeData = updates.blockTimeData;
        if (analyticsCache.blockTimeData.length > MAX_DATA_POINTS) {
            analyticsCache.blockTimeData = analyticsCache.blockTimeData.slice(-MAX_DATA_POINTS);
        }
    }
    
    if (updates.feeData) {
        analyticsCache.feeData = updates.feeData;
        if (analyticsCache.feeData.length > MAX_DATA_POINTS) {
            analyticsCache.feeData = analyticsCache.feeData.slice(-MAX_DATA_POINTS);
        }
    }
    
    if (updates.networkStats) {
        analyticsCache.networkStats = { ...analyticsCache.networkStats, ...updates.networkStats };
    }
    
    if (updates.bigTransactions) {
        analyticsCache.bigTransactions = updates.bigTransactions;
        const oneDayAgo = Date.now() - CACHE_DURATION;
        analyticsCache.bigTransactions = analyticsCache.bigTransactions.filter(
            tx => tx.timestamp > oneDayAgo
        );
    }
    
    analyticsCache.lastUpdated = Date.now();
    
    res.json({ success: true, lastUpdated: analyticsCache.lastUpdated });
});

app.post('/analytics/append', (req: Request, res: Response) => {
    const { type, data } = req.body;
    
    switch (type) {
        case 'tps':
            if (data) {
                analyticsCache.tpsHistory.push(data);
                if (analyticsCache.tpsHistory.length > MAX_DATA_POINTS) {
                    analyticsCache.tpsHistory.shift();
                }
            }
            break;
        case 'price':
            if (data) {
                analyticsCache.priceHistory.push(data);
                if (analyticsCache.priceHistory.length > MAX_DATA_POINTS) {
                    analyticsCache.priceHistory.shift();
                }
            }
            break;
        case 'txType':
            if (data && analyticsCache.txTypeStats[data]) {
                analyticsCache.txTypeStats[data]++;
            } else if (data) {
                analyticsCache.txTypeStats.Other++;
            }
            break;
        case 'activity':
            if (data) {
                analyticsCache.activityData.push(data);
                if (analyticsCache.activityData.length > 24) {
                    analyticsCache.activityData.shift();
                }
            }
            break;
        case 'blockTime':
            if (data) {
                analyticsCache.blockTimeData.push(data);
                if (analyticsCache.blockTimeData.length > MAX_DATA_POINTS) {
                    analyticsCache.blockTimeData.shift();
                }
            }
            break;
        case 'fee':
            if (data) {
                analyticsCache.feeData.push(data);
                if (analyticsCache.feeData.length > MAX_DATA_POINTS) {
                    analyticsCache.feeData.shift();
                }
            }
            break;
        case 'networkStats':
            if (data) {
                analyticsCache.networkStats = { ...analyticsCache.networkStats, ...data };
            }
            break;
        case 'bigTransaction':
            if (data) {
                // Check if transaction already exists
                const exists = analyticsCache.bigTransactions.find(tx => tx.signature === data.signature);
                if (!exists) {
                    analyticsCache.bigTransactions.push(data);
                    // Keep only transactions from last 24 hours
                    const oneDayAgo = Date.now() - CACHE_DURATION;
                    analyticsCache.bigTransactions = analyticsCache.bigTransactions.filter(
                        tx => tx.timestamp > oneDayAgo
                    );
                    // Sort by amount
                    analyticsCache.bigTransactions.sort((a, b) => b.amount - a.amount);
                }
            }
            break;
    }
    
    analyticsCache.lastUpdated = Date.now();
    res.json({ success: true, type, lastUpdated: analyticsCache.lastUpdated });
});

app.post('/solana-rpc', async (req: Request, res: Response) => {
    try {
        const rpcUrl = 'https://api.mainnet-beta.solana.com';
        
        const response = await axios.post(rpcUrl, req.body, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 30000
        });
        
        res.json(response.data);
    } catch (error) {
        const axiosError = error as AxiosError;
        console.error('Solana RPC error:', axiosError.message);
        
        if (axiosError.response?.status === 429) {
            res.status(429).json({ 
                error: { 
                    message: 'Rate limit exceeded. Please try again later.',
                    code: -32005
                }
            });
        } else {
            res.status(500).json({ 
                error: { 
                    message: 'Failed to fetch data from Solana',
                    code: -32603
                }
            });
        }
    }
});

app.get('/price/solana/:currency', async (req: Request, res: Response) => {
    const currency = req.params.currency?.toLowerCase() || 'usd';
    
    const sources = [
        {
            name: 'CoinGecko',
            url: `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=${currency}`,
            parser: (data: any) => data?.solana?.[currency] || 0
        },
        {
            name: 'CoinBase',
            url: `https://api.coinbase.com/v2/exchange-rates?currency=SOL`,
            parser: (data: any) => {
                const rate = data?.data?.rates?.[currency.toUpperCase()];
                return rate ? parseFloat(rate) : 0;
            }
        },
        {
            name: 'Binance',
            url: currency === 'usd' ? 'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT' : null,
            parser: (data: any) => data?.price ? parseFloat(data.price) : 0
        }
    ];
    
    for (const source of sources) {
        if (!source.url) continue;
        
        try {
            console.log(`Trying ${source.name} for SOL price in ${currency}...`);
            const response = await axios.get(source.url, { timeout: 5000 });
            const price = source.parser(response.data);
            
            if (price > 0) {
                console.log(`Success! SOL price from ${source.name}: ${price} ${currency}`);
                res.json({ price, source: source.name });
                return;
            }
        } catch (error) {
            console.log(`${source.name} failed:`, (error as Error).message);
        }
    }
    
    const fallbackPrices: { [key: string]: number } = {
        usd: 180,
        eur: 165,
        gbp: 142,
        jpy: 26800,
        cad: 245,
        aud: 275,
        chf: 160,
        cny: 1290,
        inr: 15000,
        krw: 235000,
        sgd: 243,
        brl: 890
    };
    
    console.log(`All price APIs failed, using fallback price for ${currency}`);
    res.json({ 
        price: fallbackPrices[currency] || fallbackPrices.usd,
        source: 'fallback'
    });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
    console.log('This server handles:');
    console.log('  - Solana RPC calls at /solana-rpc');
    console.log('  - Price data at /price/solana/:currency');
    console.log('  - Static files from the root directory');
});
