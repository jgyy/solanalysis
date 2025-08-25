// Type definitions
interface NetworkStats {
    tps: number;
    blockHeight: number;
    solPrice: number;
    validators: number;
    peakTps: number;
    hourlyTransactions: number;
    totalAnalyzed: number;
}

interface WalletInfo {
    address: string;
    name: string;
    balance?: number;
    usdValue?: number;
}

interface TokenInfo {
    address: string;
    name: string;
    symbol: string;
    supply?: number;
    formattedSupply?: string;
}

interface BigTransaction {
    amount: number;
    signature: string;
    type: string;
    timestamp: number;
    blockTime?: number;
}

type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'CNY' | 'INR' | 'KRW' | 'SGD' | 'BRL';
type CurrencySymbols = { [key in Currency]: string };
type TransactionType = 'Transfer' | 'Swap' | 'NFT' | 'Token' | 'DeFi' | 'Stake' | 'Vote' | 'Other';

interface PerformanceSample {
    numTransactions: number;
    samplePeriodSecs: number;
}

interface RpcResponse<T> {
    result?: T;
    error?: {
        message: string;
        code: number;
    };
}

interface PriceResponse {
    price?: number;
    data?: {
        rates?: {
            USD: number;
            [key: string]: number;
        };
    };
    solana?: {
        usd: number;
    };
}

interface LocationResponse {
    country_code: string;
    country_name: string;
}

interface SolanaTransaction {
    meta?: {
        err?: any;
        fee?: number;
        preBalances?: number[];
        postBalances?: number[];
        innerInstructions?: any[];
        logMessages?: string[];
    };
    transaction: {
        signatures?: string[];
        message?: {
            accountKeys?: (string | { pubkey: string })[];
        };
    };
}

const isDocker = window.location.port === '' || window.location.port === '80';
const PROXY_URL = isDocker ? '' : 'http://localhost:3000';

declare global {
    interface Window {
        reinitializeChartsForTheme?: () => void;
        toggleTheme?: () => void;
        recentFees?: number[];
    }
}

export {};

async function fetchWithFallback(body: any): Promise<Response> {
    try {
        const response = await fetch(`${PROXY_URL}/solana-rpc`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        if (!response.ok && response.status === 500) {
            console.log(`Proxy returned error for ${body.method}`);
        }
        
        return response;
    } catch (error) {
        console.error('Proxy server not available. Make sure to run: npm run proxy');
        return {
            ok: false,
            json: async () => ({ error: { message: 'Proxy server not available' } })
        } as Response;
    }
}

let networkStats: NetworkStats = {
    tps: 0,
    blockHeight: 0,
    solPrice: 0,
    validators: 0,
    peakTps: 0,
    hourlyTransactions: 0,
    totalAnalyzed: 0
};

let selectedCurrency: Currency = 'USD';
const currencySymbols: CurrencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    CHF: '₣',
    CNY: '¥',
    INR: '₹',
    KRW: '₩',
    SGD: 'S$',
    BRL: 'R$'
};

async function detectUserCurrency(): Promise<Currency> {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data: LocationResponse = await response.json();
        
        const countryCurrencyMap: { [key: string]: Currency } = {
            US: 'USD', CA: 'CAD',
            GB: 'GBP',
            DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR',
            JP: 'JPY',
            CN: 'CNY', HK: 'USD',
            IN: 'INR',
            KR: 'KRW',
            SG: 'SGD',
            AU: 'AUD', NZ: 'AUD',
            BR: 'BRL',
            CH: 'CHF',
        };
        
        const userCurrency = countryCurrencyMap[data.country_code] || 'USD';
        selectedCurrency = userCurrency as Currency;
        
        const selector = document.getElementById('currencySelector') as HTMLSelectElement;
        if (selector) {
            selector.value = userCurrency;
        }
        
        console.log(`Detected user location: ${data.country_name}, using ${userCurrency}`);
        return userCurrency as Currency;
    } catch (error) {
        console.log('Could not detect location, defaulting to USD');
        return 'USD';
    }
}

function formatPrice(amount: number, currency: Currency = selectedCurrency): string {
    const symbol = currencySymbols[currency] || '$';
    
    if (currency === 'JPY' || currency === 'KRW') {
        return `${symbol}${amount.toFixed(0)}`;
    }
    
    return `${symbol}${amount.toFixed(2)}`;
}

let countdownInterval: NodeJS.Timeout | null = null;
let updateCountdown = 10;

function startCountdown(): void {
    updateCountdown = 10;
    const countdownElement = document.getElementById('countdown');
    const timerElement = document.getElementById('updateTimer');
    
    if (countdownInterval) clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
        updateCountdown--;
        if (countdownElement) {
            countdownElement.textContent = updateCountdown.toString();
            
            if (updateCountdown === 0) {
                timerElement?.classList.add('updating');
                setTimeout(() => timerElement?.classList.remove('updating'), 1000);
            }
        }
    }, 1000);
}

function updateValueWithAnimation(elementId: string, newValue: any, formatter: (v: any) => string = (v) => v): void {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const currentValue = element.textContent;
    const formattedNewValue = formatter(newValue);
    
    if (currentValue !== formattedNewValue) {
        element.classList.add('value-updating');
        element.textContent = formattedNewValue;
        
        setTimeout(() => {
            element.classList.remove('value-updating');
        }, 600);
    }
}

let blockTimes: number[] = [];

async function fetchNetworkStats(): Promise<void> {
    try {
        const [perfResponse, blockResponse, priceResponse, validatorResponse] = await Promise.all([
            fetchWithFallback({
                jsonrpc: '2.0',
                id: 1,
                method: 'getRecentPerformanceSamples',
                params: [10]
            }),
            fetchWithFallback({
                jsonrpc: '2.0',
                id: 2,
                method: 'getBlockHeight',
                params: []
            }),
            fetch(`${PROXY_URL}/price/solana/${selectedCurrency}`).catch(() => null),
            fetchWithFallback({
                jsonrpc: '2.0',
                id: 3,
                method: 'getVoteAccounts',
                params: []
            })
        ]);

        const [perfData, blockData, validatorData] = await Promise.all([
            perfResponse.json() as Promise<RpcResponse<PerformanceSample[]>>,
            blockResponse.json() as Promise<RpcResponse<number>>,
            validatorResponse.json() as Promise<RpcResponse<any>>
        ]);
        
        let priceData: PriceResponse | null = null;
        if (priceResponse) {
            try {
                priceData = await priceResponse.json();
            } catch (e) {
                console.log('Failed to parse price data');
            }
        }

        if (perfData.result && perfData.result.length > 0) {
            const samples = perfData.result.filter((sample: PerformanceSample) => 
                sample && sample.numTransactions > 0 && sample.samplePeriodSecs > 0
            );
            
            if (samples.length > 0) {
                const tpsValues = samples.map((sample: PerformanceSample) => 
                    sample.numTransactions / sample.samplePeriodSecs
                );
                
                const averageTps = Math.round(
                    tpsValues.reduce((sum: number, tps: number) => sum + tps, 0) / tpsValues.length
                );
                
                const currentTps = Math.round(samples[0].numTransactions / samples[0].samplePeriodSecs);
                
                networkStats.tps = currentTps > 0 ? currentTps : averageTps;
                networkStats.peakTps = Math.max(networkStats.peakTps, networkStats.tps);
                networkStats.hourlyTransactions += samples[0].numTransactions;
                
                updateValueWithAnimation('networkTps', networkStats.tps, v => v.toLocaleString());
                
                if (typeof (window as any).updateTPSChart === 'function') {
                    (window as any).updateTPSChart(networkStats.tps);
                }
            } else {
                console.log('No valid performance samples received');
                const elem = document.getElementById('networkTps');
                if (elem) elem.textContent = '---';
            }
        } else {
            console.log('No performance data received');
            const elem = document.getElementById('networkTps');
            if (elem) elem.textContent = '---';
        }

        if (blockData.result) {
            networkStats.blockHeight = blockData.result;
            updateValueWithAnimation('blockHeight', blockData.result, v => v.toLocaleString());
        }

        if (priceData) {
            let price = 0;
            if (priceData.price) {
                price = priceData.price;
            } else if (priceData.data?.rates?.USD) {
                price = priceData.data.rates.USD;
            } else if (priceData.solana?.usd) {
                price = priceData.solana.usd;
            }
            
            if (price > 0) {
                networkStats.solPrice = price;
                updateValueWithAnimation('solPrice', price, v => formatPrice(v, selectedCurrency));
                
                if (typeof (window as any).updatePriceChart === 'function') {
                    (window as any).updatePriceChart(price);
                }
            } else {
                const elem = document.getElementById('solPrice');
                if (elem) elem.textContent = `${currencySymbols[selectedCurrency]}---`;
            }
        } else {
            const elem = document.getElementById('solPrice');
            if (elem) elem.textContent = `${currencySymbols[selectedCurrency]}---`;
        }

        if (validatorData.result) {
            networkStats.validators = validatorData.result.current.length;
            updateValueWithAnimation('validators', validatorData.result.current.length, v => v.toLocaleString());
        }

        updateNetworkActivity();
        
    } catch (error) {
        console.error('Error fetching network stats:', error);
        const statusElem = document.getElementById('connectionStatus');
        if (statusElem) {
            statusElem.innerHTML = '<i class="fas fa-exclamation-circle"></i> Connection Error';
            statusElem.style.color = '#FF5555';
        }
    }
}

let processedSignatures = new Set<string>();

async function fetchLiveTransactions(): Promise<void> {
    try {
        if (!networkStats.blockHeight || networkStats.blockHeight === 0) {
            console.log('Waiting for block height...');
            return;
        }
        const blockToFetch = Math.max(1, networkStats.blockHeight - Math.floor(Math.random() * 3));
        
        const response = await fetchWithFallback({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBlock',
            params: [
                blockToFetch,
                {
                    encoding: 'json',
                    transactionDetails: 'full',
                    rewards: false,
                    maxSupportedTransactionVersion: 0
                }
            ]
        });

        const data: RpcResponse<{ transactions: SolanaTransaction[] }> = await response.json();
        const tbody = document.getElementById('liveTxFeed') as HTMLTableSectionElement;

        if (data.error) {
            console.log('Block fetch error:', data.error.message);
            if (tbody.children.length === 0 || tbody.children[0].classList.contains('loading')) {
                tbody.innerHTML = '<tr><td colspan="5" class="loading">Unable to fetch transactions - RPC limit reached</td></tr>';
            }
            return;
        }

        if (data.result?.transactions) {
            if (tbody.children.length > 0 && tbody.children[0].classList.contains('loading')) {
                tbody.innerHTML = '';
            }

            const nonVoteTransactions = data.result.transactions.filter((tx: SolanaTransaction) => {
                const type = detectTransactionType(tx);
                return type !== 'Vote';
            });

            nonVoteTransactions.slice(0, 10).forEach((tx: SolanaTransaction) => {
                const signature = tx.transaction.signatures?.[0];
                
                if (signature && processedSignatures.has(signature)) {
                    return;
                }
                
                if (signature) {
                    processedSignatures.add(signature);
                    
                    if (processedSignatures.size > 1000) {
                        const firstKey = processedSignatures.values().next().value;
                        if (firstKey) {
                            processedSignatures.delete(firstKey);
                        }
                    }
                }

                const time = new Date().toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                    timeZoneName: 'short'
                });
                const fee = tx.meta && tx.meta.fee !== undefined ? (tx.meta.fee / 1000000000).toFixed(6) : '0';
                const status = tx.meta?.err ? 'Failed' : 'Success';
                const type = detectTransactionType(tx);
                const amount = calculateTransactionAmount(tx);

                const row = document.createElement('tr');
                row.className = 'new-row';
                row.innerHTML = `
                    <td>${time}</td>
                    <td><span class="tx-type-${type.toLowerCase()}">${type}</span></td>
                    <td>${amount} SOL</td>
                    <td>${fee} SOL</td>
                    <td><span class="status-${status.toLowerCase()}">${status}</span></td>
                `;
                
                tbody.insertBefore(row, tbody.firstChild);
                
                if (tbody.children.length > 20 && tbody.lastChild) {
                    tbody.removeChild(tbody.lastChild);
                }

                networkStats.totalAnalyzed++;
                
                if (typeof (window as any).updateTxTypesChart === 'function') {
                    (window as any).updateTxTypesChart(type);
                }
                
                if (typeof (window as any).updateAnalyticsStats === 'function') {
                    (window as any).updateAnalyticsStats({
                        error: status === 'Failed',
                        amount: amount,
                        program: type
                    });
                }
                
                if (typeof (window as any).updateFeeChart === 'function' && fee) {
                    const feeNum = parseFloat(fee);
                    if (!window.recentFees) window.recentFees = [];
                    window.recentFees.push(feeNum);
                    if (window.recentFees.length > 100) window.recentFees.shift();
                    
                    const avgFee = window.recentFees.reduce((a: number, b: number) => a + b, 0) / window.recentFees.length;
                    const maxFee = Math.max(...window.recentFees);
                    (window as any).updateFeeChart(avgFee, maxFee);
                }
            });

            const totalElem = document.getElementById('totalAnalyzed');
            if (totalElem) totalElem.textContent = networkStats.totalAnalyzed.toLocaleString();
        }
    } catch (error) {
        console.error('Error fetching live transactions:', error);
    }
}

function detectTransactionType(tx: SolanaTransaction): TransactionType {
    if (!tx.transaction?.message) return 'Transfer';
    
    const accountKeys = tx.transaction.message.accountKeys || [];
    
    if (tx.meta?.innerInstructions || tx.meta?.logMessages) {
        const logs = tx.meta.logMessages || [];
        const logsStr = logs.join(' ').toLowerCase();
        
        if (logsStr.includes('vote')) return 'Vote';
        if (logsStr.includes('stake')) return 'Stake';
        if (logsStr.includes('swap') || logsStr.includes('raydium') || logsStr.includes('orca')) return 'Swap';
        if (logsStr.includes('nft') || logsStr.includes('metaplex') || logsStr.includes('candy')) return 'NFT';
        if (logsStr.includes('token') || logsStr.includes('mint')) return 'Token';
        if (logsStr.includes('defi') || logsStr.includes('lend') || logsStr.includes('borrow')) return 'DeFi';
    }
    
    const programIds = accountKeys.map((key: any) => typeof key === 'string' ? key : key.pubkey).filter(Boolean);
    const programString = programIds.join(' ');
    
    if (programString.includes('Vote111111111111111111111111111111111111111')) return 'Vote';
    if (programString.includes('Stake11111111111111111111111111111111111111')) return 'Stake';
    if (programString.includes('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')) return 'Token';
    if (programString.includes('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')) return 'NFT';
    if (programString.includes('9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP')) return 'Swap';
    if (programString.includes('JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB')) return 'Swap';
    
    if (tx.meta?.postBalances && tx.meta?.preBalances) {
        const hasSignificantChange = tx.meta.preBalances.some((pre: number, idx: number) => {
            const post = tx.meta?.postBalances?.[idx];
            if (post === undefined) return false;
            return Math.abs(post - pre) > 1000000000;
        });
        if (hasSignificantChange) return 'Transfer';
    }
    
    return 'Transfer';
}

function calculateTransactionAmount(tx: SolanaTransaction): string {
    if (!tx.meta) return '0';
    
    const preBalances = tx.meta.preBalances || [];
    const postBalances = tx.meta.postBalances || [];
    
    let maxChange = 0;
    for (let i = 0; i < preBalances.length && i < postBalances.length; i++) {
        const change = Math.abs(postBalances[i] - preBalances[i]) / 1000000000;
        maxChange = Math.max(maxChange, change);
    }
    
    return maxChange.toFixed(4);
}

async function fetchTopWallets(): Promise<void> {
    const walletsContainer = document.getElementById('topWallets');
    if (!walletsContainer) return;
    
    const potentialWallets: WalletInfo[] = [
        // Prioritize wallets most likely to have large balances
        { address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', name: 'Binance Main' },
        { address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', name: 'Binance Hot Wallet' },
        { address: 'H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS', name: 'Coinbase' },
        { address: '2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm', name: 'Kraken' },
        { address: '88881Hu2jGMfCs9tMu5Rr7Ah7WBNBuXqde4nR5ZmKYYy', name: 'OKX Exchange' },
        { address: 'Eg5jqooyG6ySaXKbQUu4Lpvu2SqUPZrNkM4zXs9iUDLJ', name: 'Crypto.com' },
        { address: '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T', name: 'Gate.io' },
        { address: 'AHB94zKUASftTdqgdfiDSdnPJHkEFgMvSaQtRQMwgY4c', name: 'KuCoin' },
        { address: 'GuxBSrv5jnSwwPepkqnmkM7YCBSakKanbnw4BKMdda4F', name: 'Bitfinex' },
        { address: 'EFnVqfWKNFuDhaJNHeYSYKp1aCwLhmqQzz3wvJeA8eJH', name: 'Bybit Cold Wallet' },
        { address: 'CXPeim1wQMkcTvEHx9QdhHe3uQreUdbxXJTLVAcWRbNt', name: 'Huobi Exchange' },
        
        // Staking pools and liquid staking
        { address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', name: 'Marinade Staked SOL' },
        { address: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', name: 'Jito Staked SOL' },
        { address: 'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1', name: 'BlazeStake Pool' },
        { address: 'stSo1mDQTq6uPGaarxydEjzvky3QNYuzJYGgUQBVS2M', name: 'Lido Staked SOL' },
        
        // DeFi protocols
        { address: '7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2', name: 'Orca Whirlpool' },
        { address: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', name: 'Raydium AMM V4' },
        { address: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', name: 'Jupiter Aggregator' },
        
        // Market makers and trading firms
        { address: 'ARjxTFWE1T1WsKJxKvG7ETkJ3kYEZLfC91wyYkNbwYXv', name: 'Jump Trading' },
        { address: '3yUDo43vdnJKqHLJBzXgLCqzFBsDZJ2hAjacVKGVJMUr', name: 'Alameda Research' },
        { address: '14kqryJUc9HKvgMUjN265z3vD9t8nFPAP7raQN3ePZBn', name: 'BitMEX' },
        
        // Large holders and institutions
        { address: '52C9T2T7JRojtxumYnYZhyUmrN7kqzvCLc4Ksvjk7TxD', name: 'Top Holder #1' },
        { address: '8BseXT9EtoEhBTKFFYkwTnjKSUZwhtmdKY2Jrj8j45Rt', name: 'Top Holder #2' },
        { address: 'H6vpvhyv8nVeXsoE3GCyZ4q2EViENnzwTJzw5fe8LnFV', name: 'Top Holder #3' },
        { address: '3KdEDGvJKBqfJXFNDhBUNcULyMiVnCthmVVggkmZp5Rj', name: 'Top Holder #4' },
        { address: '7nnFLEKHMFgEQbYiE9U8xznbePEaFRjCULCwBrz9Y5Jx', name: 'Top Holder #5' },
        
        // Bankrupt/Estate wallets
        { address: 'FTX2jrw1p53AZSxFPPcrmVVGCvT7qcN9X5yLvF1sZYxf', name: 'FTX Estate Main' },
        { address: '7VBa8Gid3Xh2MZvLxk5QD3nhCzFdAZnDm4a5vvNWsJnY', name: 'FTX/Alameda' },
        { address: 'Dv8bBNQQWdnoJ2SmJ2aVaDWi5wPgLNBhqBhzjmX6SgAm', name: 'FTX Estate' },
        { address: 'BWe3inxV4gYKBdqMHS8UxN7AwNkhqNAaAfhcphw5baKp', name: 'Celsius Network' },
        { address: '8CvwxZ5A7RpKiDStjGMYkYt43NhcRPMtnKQQhdGX5PK9', name: 'Voyager Digital' },
        { address: '63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9', name: 'Genesis Trading' },
        { address: 'E7horS2PiJYYZWpC6tanp3VgMupeAwyaWQMvWKaWvGXz', name: 'Three Arrows Capital' },
        
        // Additional exchange cold wallets
        { address: 'FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5', name: 'Exchange Wallet' },
        { address: '3sxVPrLXUgNRAaKcQgR9kMFTS5WnPpafAVkqJzX2E3UV', name: 'Alameda Research' },
        { address: 'nm1LeGksEwW3Kw9gSYH8vBqRbyZW4Fvr3EXfZH2bZxq', name: 'Unknown Whale 1' },
        { address: 'BLwKzyYLamhJRZbLTYde1BpAHBAb96hQhU7SqXLSGKa3', name: 'Unknown Whale 2' },
        { address: '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9', name: 'Unknown Whale 3' },
        { address: '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E', name: 'Unknown Whale 4' },
        { address: 'HBZY42BfG6PJqPQ8s1GuxVkVQvRYWvAyt9aDZzScsQyp', name: 'Unknown Whale 5' }
    ];

    const verifiedWhales: WalletInfo[] = [];
    walletsContainer.innerHTML = '<div class="loading-card"><div class="spinner"></div><p>Verifying whale wallets...</p></div>';
    
    for (const wallet of potentialWallets) {
        try {
            const response = await fetchWithFallback({
                jsonrpc: '2.0',
                id: 1,
                method: 'getBalance',
                params: [wallet.address]
            });
            
            const data: RpcResponse<{ value: number }> = await response.json();
            if (data.result) {
                const balance = data.result.value / 1000000000;
                
                if (balance > 10000) {
                    verifiedWhales.push({
                        ...wallet,
                        balance: balance,
                        usdValue: balance * networkStats.solPrice
                    });
                    console.log(`Found whale: ${wallet.name} with ${balance.toFixed(0)} SOL`);
                } else {
                    console.log(`Skipping ${wallet.name}: only ${balance.toFixed(2)} SOL`);
                }
            }
        } catch (error) {
            console.error(`Error checking wallet ${wallet.name}:`, error);
        }
    }
    
    verifiedWhales.sort((a, b) => (b.balance || 0) - (a.balance || 0));
    
    let html = '';
    if (verifiedWhales.length > 0) {
        verifiedWhales.slice(0, 4).forEach((wallet, index) => {
            html += `
                <div class="wallet-card">
                    <div class="wallet-rank">#${index + 1}</div>
                    <div class="wallet-address">${wallet.name}</div>
                    <div class="wallet-stats">
                        <div class="wallet-stat">
                            <div class="wallet-stat-value">${wallet.balance?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            <div class="wallet-stat-label">SOL Balance</div>
                        </div>
                        <div class="wallet-stat">
                            <div class="wallet-stat-value">${currencySymbols[selectedCurrency]}${((wallet.usdValue || 0) / 1000000).toFixed(1)}M</div>
                            <div class="wallet-stat-label">${selectedCurrency} Value</div>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        html = '<div class="loading-card"><p>No whale wallets found (>10,000 SOL). API may be rate limited.</p></div>';
    }
    
    walletsContainer.innerHTML = html;
}

async function fetchPopularTokens(): Promise<void> {
    const tokensContainer = document.getElementById('popularTokens');
    if (!tokensContainer) return;
    
    const popularTokens: TokenInfo[] = [
        { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', name: 'USD Coin', symbol: 'USDC' },
        { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', name: 'Tether', symbol: 'USDT' },
        { address: '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj', name: 'Lido Staked SOL', symbol: 'stSOL' },
        { address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', name: 'Marinade Staked SOL', symbol: 'mSOL' },
        { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', name: 'Bonk', symbol: 'BONK' },
        { address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', name: 'Jupiter', symbol: 'JUP' },
        { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', name: 'Dogwifhat', symbol: 'WIF' },
        { address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', name: 'Pyth Network', symbol: 'PYTH' }
    ];

    const verifiedTokens: TokenInfo[] = [];
    tokensContainer.innerHTML = '<div class="loading-card"><div class="spinner"></div><p>Loading popular tokens...</p></div>';
    
    for (const token of popularTokens) {
        try {
            const response = await fetchWithFallback({
                jsonrpc: '2.0',
                id: 1,
                method: 'getTokenSupply',
                params: [token.address]
            });
            
            const data: RpcResponse<{ value: { amount: string; decimals: number } }> = await response.json();
            
            if (data.result?.value) {
                const amount = parseFloat(data.result.value.amount);
                const decimals = data.result.value.decimals;
                const supply = amount / Math.pow(10, decimals);
                
                if (supply > 0) {
                    verifiedTokens.push({
                        ...token,
                        supply: supply,
                        formattedSupply: supply.toLocaleString(undefined, {
                            maximumFractionDigits: 0
                        })
                    });
                    console.log(`Found token: ${token.symbol} with supply ${supply.toFixed(0)}`);
                } else {
                    console.log(`Skipping ${token.symbol}: zero supply`);
                }
            }
        } catch (error) {
            console.error(`Error checking token ${token.symbol}:`, error);
        }
    }
    
    let html = '';
    if (verifiedTokens.length > 0) {
        verifiedTokens.slice(0, 4).forEach((token, index) => {
            html += `
                <div class="token-card">
                    <div class="token-rank">#${index + 1}</div>
                    <div class="token-name">${token.name} (${token.symbol})</div>
                    <div class="token-stats">
                        <div class="token-stat">
                            <div class="token-stat-value">${token.formattedSupply}</div>
                            <div class="token-stat-label">Total Supply</div>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        html = '<div class="loading-card"><p>No tokens with valid supply found. API may be rate limited.</p></div>';
    }
    
    tokensContainer.innerHTML = html || '<div class="loading-card"><p>Unable to load token data</p></div>';
}

function updateNetworkActivity(): void {
    updateValueWithAnimation('hourlyTx', networkStats.hourlyTransactions, v => v.toLocaleString());
    updateValueWithAnimation('peakTps', networkStats.peakTps, v => v.toLocaleString());
    
    const avgBlockTimeElem = document.getElementById('avgBlockTime');
    if (avgBlockTimeElem) {
        if (blockTimes.length > 1) {
            const avgTime = blockTimes.reduce((a, b) => a + b, 0) / blockTimes.length;
            avgBlockTimeElem.textContent = `${avgTime.toFixed(1)}s`;
        } else {
            avgBlockTimeElem.textContent = '~0.4s';
        }
    }
    
    const maxTps = 65000;
    const load = Math.min(100, (networkStats.tps / maxTps) * 100);
    const loadElem = document.getElementById('networkLoad');
    if (loadElem) loadElem.textContent = `${load.toFixed(1)}%`;
    
    if (typeof (window as any).updateActivityChart === 'function') {
        (window as any).updateActivityChart(load);
    }
}

let recentBigTransactions: BigTransaction[] = [];

// Function to load cached analytics data from backend
async function loadCachedAnalytics(): Promise<void> {
    try {
        const response = await fetch(`${PROXY_URL}/analytics/cache`);
        if (response.ok) {
            const cachedData = await response.json();
            
            // Restore network stats
            if (cachedData.networkStats) {
                networkStats = { ...networkStats, ...cachedData.networkStats };
                
                // Update UI with cached network stats
                updateValueWithAnimation('networkTps', networkStats.tps, v => v.toLocaleString());
                updateValueWithAnimation('blockHeight', networkStats.blockHeight, v => v.toLocaleString());
                updateValueWithAnimation('solPrice', networkStats.solPrice, v => formatPrice(v, selectedCurrency));
                updateValueWithAnimation('validators', networkStats.validators, v => v.toLocaleString());
                updateValueWithAnimation('hourlyTx', networkStats.hourlyTransactions, v => v.toLocaleString());
                updateValueWithAnimation('peakTps', networkStats.peakTps, v => v.toLocaleString());
                updateValueWithAnimation('totalAnalyzed', networkStats.totalAnalyzed, v => v.toLocaleString());
            }
            
            // Restore big transactions
            if (cachedData.bigTransactions) {
                recentBigTransactions = cachedData.bigTransactions;
                displayBigTransactions();
            }
            
            // Restore chart data
            if (typeof (window as any).restoreChartData === 'function') {
                (window as any).restoreChartData(cachedData);
            }
            
            console.log('Loaded cached analytics data');
        }
    } catch (error) {
        console.error('Error loading cached analytics:', error);
    }
}

// Function to save current analytics data to backend
async function saveAnalyticsToCache(): Promise<void> {
    try {
        const chartData = typeof (window as any).getChartData === 'function' 
            ? (window as any).getChartData() 
            : {};
        
        const cacheData = {
            ...chartData,
            networkStats,
            bigTransactions: recentBigTransactions
        };
        
        await fetch(`${PROXY_URL}/analytics/cache`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cacheData)
        });
    } catch (error) {
        console.error('Error saving analytics to cache:', error);
    }
}

function displayBigTransactions(): void {
    const container = document.getElementById('bigTransactions');
    if (!container) return;
    
    let html = '';
    const topTransactions = recentBigTransactions.slice(0, 5);
    
    if (topTransactions.length === 0) {
        html = '<div class="loading-card"><p>Searching for large transactions...</p></div>';
    } else {
        topTransactions.forEach(tx => {
            const timeAgo = getTimeAgo(tx.timestamp);
            const localTime = formatLocalTime(tx.timestamp);
            const usdValue = (tx.amount * networkStats.solPrice).toLocaleString(undefined, {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 0
            });
            
            html += `
                <div class="big-tx-item">
                    <div>
                        <div class="big-tx-amount">${tx.amount.toLocaleString()} SOL</div>
                        <div class="big-tx-details">${tx.type} Transaction</div>
                    </div>
                    <div>
                        <div class="big-tx-details">${usdValue}</div>
                        <div class="big-tx-details">${timeAgo} • ${localTime}</div>
                    </div>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
}

async function fetchBigTransactions(): Promise<void> {
    const container = document.getElementById('bigTransactions');
    if (!container) return;
    
    try {
        if (!networkStats.blockHeight || networkStats.blockHeight === 0) {
            console.log('Waiting for block height for big transactions...');
            return;
        }
        
        const response = await fetchWithFallback({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBlock',
            params: [
                Math.max(1, networkStats.blockHeight - Math.floor(Math.random() * 10)),
                {
                    encoding: 'json',
                    transactionDetails: 'full',
                    rewards: false,
                    maxSupportedTransactionVersion: 0
                }
            ]
        });

        const data: RpcResponse<{ transactions: SolanaTransaction[]; blockTime?: number }> = await response.json();
        
        if (data.result?.transactions) {
            const now = Date.now();
            
            data.result.transactions.forEach((tx: SolanaTransaction) => {
                if (tx.meta && !tx.meta.err) {
                    const amount = calculateTransactionAmount(tx);
                    const amountNum = parseFloat(amount);
                    
                    if (amountNum > 10) {
                        const signature = tx.transaction.signatures?.[0] || 'Unknown';
                        
                        const exists = recentBigTransactions.find(t => t.signature === signature);
                        if (!exists) {
                            recentBigTransactions.push({
                                amount: amountNum,
                                signature: signature,
                                type: detectTransactionType(tx),
                                timestamp: now,
                                blockTime: data.result!.blockTime
                            });
                        }
                    }
                }
            });
            
            recentBigTransactions = recentBigTransactions.filter(tx => 
                now - tx.timestamp < 3600000
            );
            
            recentBigTransactions.sort((a, b) => b.amount - a.amount);
            
            displayBigTransactions();
        }
    } catch (error) {
        console.error('Error fetching big transactions:', error);
        container.innerHTML = '<div class="loading-card"><p>Unable to load large transactions</p></div>';
    }
}

function getTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 120) return '1 min ago';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 7200) return '1 hour ago';
    return `${Math.floor(seconds / 3600)} hours ago`;
}

function formatLocalTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
    });
}

// function getUserTimezone(): string {
//     return Intl.DateTimeFormat().resolvedOptions().timeZone;
// } // Reserved for future use

let lastBlockTime = Date.now();
function trackBlockTime(): void {
    const now = Date.now();
    const timeDiff = (now - lastBlockTime) / 1000;
    
    blockTimes.push(timeDiff);
    if (blockTimes.length > 10) {
        blockTimes.shift();
    }
    
    lastBlockTime = now;
    
    if (typeof (window as any).updateBlockTimeChart === 'function') {
        const blockTimeMs = timeDiff * 1000;
        (window as any).updateBlockTimeChart(blockTimeMs);
    }
}

function initTheme(): void {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme(): void {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    if (typeof window.reinitializeChartsForTheme === 'function') {
        window.reinitializeChartsForTheme();
    }
}

function updateThemeIcon(theme: string): void {
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
        themeIcon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('User timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    
    initTheme();
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    await detectUserCurrency();
    
    const currencySelector = document.getElementById('currencySelector') as HTMLSelectElement;
    if (currencySelector) {
        currencySelector.addEventListener('change', async (e) => {
            selectedCurrency = (e.target as HTMLSelectElement).value as Currency;
            console.log(`Currency changed to ${selectedCurrency}`);
            
            await fetchNetworkStats();
            fetchTopWallets();
            
            localStorage.setItem('preferredCurrency', selectedCurrency);
        });
        
        const savedCurrency = localStorage.getItem('preferredCurrency');
        if (savedCurrency && currencySymbols[savedCurrency as Currency]) {
            selectedCurrency = savedCurrency as Currency;
            currencySelector.value = savedCurrency;
            console.log(`Using saved currency preference: ${savedCurrency}`);
        }
    }
    
    // Load cached data first
    await loadCachedAnalytics();
    
    // Then fetch fresh data
    await fetchNetworkStats();
    
    fetchLiveTransactions();
    fetchTopWallets();
    fetchPopularTokens();
    fetchBigTransactions();
    
    startCountdown();
    
    // Regular updates
    setInterval(() => {
        fetchNetworkStats();
        fetchLiveTransactions();
        fetchBigTransactions();
        trackBlockTime();
        startCountdown();
    }, 10000);
    
    setInterval(() => {
        fetchTopWallets();
        fetchPopularTokens();
    }, 60000);
    
    // Save analytics to cache every 30 seconds
    setInterval(() => {
        saveAnalyticsToCache();
    }, 30000);
});

console.log('Solanalysis by Jeffrey Goh - Blockchain Analysis');

window.toggleTheme = toggleTheme;
