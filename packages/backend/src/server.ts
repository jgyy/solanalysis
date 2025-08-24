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
