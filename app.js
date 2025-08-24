const PROXY_URL = 'http://localhost:3000';

async function fetchWithFallback(body) {
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
        };
    }
}

let networkStats = {
    tps: 0,
    blockHeight: 0,
    solPrice: 0,
    validators: 0,
    peakTps: 0,
    hourlyTransactions: 0,
    totalAnalyzed: 0
};

let selectedCurrency = 'USD';
const currencySymbols = {
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

async function detectUserCurrency() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        const countryCurrencyMap = {
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
        selectedCurrency = userCurrency;
        
        const selector = document.getElementById('currencySelector');
        if (selector) {
            selector.value = userCurrency;
        }
        
        console.log(`Detected user location: ${data.country_name}, using ${userCurrency}`);
        return userCurrency;
    } catch (error) {
        console.log('Could not detect location, defaulting to USD');
        return 'USD';
    }
}

function formatPrice(amount, currency = selectedCurrency) {
    const symbol = currencySymbols[currency] || '$';
    
    if (currency === 'JPY' || currency === 'KRW') {
        return `${symbol}${amount.toFixed(0)}`;
    }
    
    return `${symbol}${amount.toFixed(2)}`;
}

let countdownInterval;
let updateCountdown = 10;

function startCountdown() {
    updateCountdown = 10;
    const countdownElement = document.getElementById('countdown');
    const timerElement = document.getElementById('updateTimer');
    
    if (countdownInterval) clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
        updateCountdown--;
        if (countdownElement) {
            countdownElement.textContent = updateCountdown;
            
            if (updateCountdown === 0) {
                timerElement.classList.add('updating');
                setTimeout(() => timerElement.classList.remove('updating'), 1000);
            }
        }
    }, 1000);
}

function updateValueWithAnimation(elementId, newValue, formatter = (v) => v) {
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

let blockTimes = [];

async function fetchNetworkStats() {
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
            perfResponse.json(),
            blockResponse.json(),
            validatorResponse.json()
        ]);
        
        let priceData = null;
        if (priceResponse) {
            try {
                priceData = await priceResponse.json();
            } catch (e) {
                console.log('Failed to parse price data');
            }
        }

        if (perfData.result && perfData.result.length > 0) {
            const samples = perfData.result.filter(sample => 
                sample && sample.numTransactions > 0 && sample.samplePeriodSecs > 0
            );
            
            if (samples.length > 0) {
                const tpsValues = samples.map(sample => 
                    sample.numTransactions / sample.samplePeriodSecs
                );
                
                const averageTps = Math.round(
                    tpsValues.reduce((sum, tps) => sum + tps, 0) / tpsValues.length
                );
                
                const currentTps = Math.round(samples[0].numTransactions / samples[0].samplePeriodSecs);
                
                networkStats.tps = currentTps > 0 ? currentTps : averageTps;
                networkStats.peakTps = Math.max(networkStats.peakTps, networkStats.tps);
                networkStats.hourlyTransactions += samples[0].numTransactions;
                
                updateValueWithAnimation('networkTps', networkStats.tps, v => v.toLocaleString());
                
                if (typeof updateTPSChart === 'function') {
                    updateTPSChart(networkStats.tps);
                }
            } else {
                console.log('No valid performance samples received');
                document.getElementById('networkTps').textContent = '---';
            }
        } else {
            console.log('No performance data received');
            document.getElementById('networkTps').textContent = '---';
        }

        if (blockData.result) {
            networkStats.blockHeight = blockData.result;
            updateValueWithAnimation('blockHeight', blockData.result, v => v.toLocaleString());
        }

        if (priceData) {
            let price = 0;
            if (priceData.price) {
                price = parseFloat(priceData.price);
            } else if (priceData.data?.rates?.USD) {
                price = parseFloat(priceData.data.rates.USD);
            } else if (priceData.solana?.usd) {
                price = priceData.solana.usd;
            }
            
            if (price > 0) {
                networkStats.solPrice = price;
                updateValueWithAnimation('solPrice', price, v => formatPrice(v, selectedCurrency));
                
                if (typeof updatePriceChart === 'function') {
                    updatePriceChart(price);
                }
            } else {
                document.getElementById('solPrice').textContent = `${currencySymbols[selectedCurrency]}---`;
            }
        } else {
            document.getElementById('solPrice').textContent = `${currencySymbols[selectedCurrency]}---`;
        }

        if (validatorData.result) {
            networkStats.validators = validatorData.result.current.length;
            updateValueWithAnimation('validators', validatorData.result.current.length, v => v.toLocaleString());
        }

        updateNetworkActivity();
        
    } catch (error) {
        console.error('Error fetching network stats:', error);
        document.getElementById('connectionStatus').innerHTML = '<i class="fas fa-exclamation-circle"></i> Connection Error';
        document.getElementById('connectionStatus').style.color = '#FF5555';
    }
}

let processedSignatures = new Set();

async function fetchLiveTransactions() {
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

        const data = await response.json();
        const tbody = document.getElementById('liveTxFeed');

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

            const nonVoteTransactions = data.result.transactions.filter(tx => {
                const type = detectTransactionType(tx);
                return type !== 'Vote';
            });

            nonVoteTransactions.slice(0, 10).forEach(tx => {
                const signature = tx.transaction.signatures?.[0];
                
                if (signature && processedSignatures.has(signature)) {
                    return;
                }
                
                if (signature) {
                    processedSignatures.add(signature);
                    
                    if (processedSignatures.size > 1000) {
                        const firstKey = processedSignatures.values().next().value;
                        processedSignatures.delete(firstKey);
                    }
                }

                // Use current time for live feed since these are recent transactions
                const time = new Date().toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                    timeZoneName: 'short'
                });
                const fee = tx.meta ? (tx.meta.fee / 1000000000).toFixed(6) : '0';
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
                
                if (tbody.children.length > 20) {
                    tbody.removeChild(tbody.lastChild);
                }

                networkStats.totalAnalyzed++;
                
                if (typeof updateTxTypesChart === 'function') {
                    updateTxTypesChart(type);
                }
                
                if (typeof updateAnalyticsStats === 'function') {
                    updateAnalyticsStats({
                        error: status === 'Failed',
                        amount: amount,
                        program: type
                    });
                }
                
                if (typeof updateFeeChart === 'function' && fee) {
                    const feeNum = parseFloat(fee);
                    if (!window.recentFees) window.recentFees = [];
                    window.recentFees.push(feeNum);
                    if (window.recentFees.length > 100) window.recentFees.shift();
                    
                    const avgFee = window.recentFees.reduce((a, b) => a + b, 0) / window.recentFees.length;
                    const maxFee = Math.max(...window.recentFees);
                    updateFeeChart(avgFee, maxFee);
                }
            });

            document.getElementById('totalAnalyzed').textContent = networkStats.totalAnalyzed.toLocaleString();
        }
    } catch (error) {
        console.error('Error fetching live transactions:', error);
    }
}

function detectTransactionType(tx) {
    if (!tx.transaction?.message) return 'Transfer';
    
    const accountKeys = tx.transaction.message.accountKeys || [];
    const instructions = tx.transaction.message.instructions || [];
    
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
    
    const programIds = accountKeys.map(key => key.pubkey || key).filter(Boolean);
    const programString = programIds.join(' ');
    
    if (programString.includes('Vote111111111111111111111111111111111111111')) return 'Vote';
    if (programString.includes('Stake11111111111111111111111111111111111111')) return 'Stake';
    if (programString.includes('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')) return 'Token';
    if (programString.includes('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')) return 'NFT';
    if (programString.includes('9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP')) return 'Swap';
    if (programString.includes('JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB')) return 'Swap';
    
    if (tx.meta?.postBalances && tx.meta?.preBalances) {
        const hasSignificantChange = tx.meta.preBalances.some((pre, idx) => {
            const post = tx.meta.postBalances[idx];
            return Math.abs(post - pre) > 1000000000; // More than 1 SOL
        });
        if (hasSignificantChange) return 'Transfer';
    }
    
    return 'Transfer';
}

function calculateTransactionAmount(tx) {
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

async function fetchTopWallets() {
    const walletsContainer = document.getElementById('topWallets');
    
    const potentialWallets = [
        { address: '52C9T2T7JRojtxumYnYZhyUmrN7kqzvCLc4Ksvjk7TxD', name: 'Top Holder #1' },
        { address: '8BseXT9EtoEhBTKFFYkwTnjKSUZwhtmdKY2Jrj8j45Rt', name: 'Top Holder #2' },
        { address: 'H6vpvhyv8nVeXsoE3GCyZ4q2EViENnzwTJzw5fe8LnFV', name: 'Top Holder #35' },
        { address: 'FTX2jrw1p53AZSxFPPcrmVVGCvT7qcN9X5yLvF1sZYxf', name: 'FTX Estate Main' },
        { address: '7VBa8Gid3Xh2MZvLxk5QD3nhCzFdAZnDm4a5vvNWsJnY', name: 'FTX/Alameda' },
        { address: '3sxVPrLXUgNRAaKcQgR9kMFTS5WnPpafAVkqJzX2E3UV', name: 'Alameda Research' },
        { address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', name: 'Binance Main' },
        { address: 'FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5', name: 'Exchange Wallet' },
        { address: 'H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS', name: 'Coinbase' },
        { address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', name: 'Binance Hot Wallet' },
        { address: '2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm', name: 'Kraken' },
        { address: 'Eg5jqooyG6ySaXKbQUu4Lpvu2SqUPZrNkM4zXs9iUDLJ', name: 'Crypto.com' },
        { address: '88881Hu2jGMfCs9tMu5Rr7Ah7WBNBuXqde4nR5ZmKYYy', name: 'OKX Exchange' },
        { address: '4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T', name: 'Gate.io' },
        { address: 'CXPeim1wQMkcTvEHx9QdhHe3uQreUdbxXJTLVAcWRbNt', name: 'Huobi Exchange' },
        { address: 'AHB94zKUASftTdqgdfiDSdnPJHkEFgMvSaQtRQMwgY4c', name: 'KuCoin' },
        { address: 'GuxBSrv5jnSwwPepkqnmkM7YCBSakKanbnw4BKMdda4F', name: 'Bitfinex' },
        { address: 'nm1LeGksEwW3Kw9gSYH8vBqRbyZW4Fvr3EXfZH2bZxq', name: 'Unknown Whale 1' },
        { address: 'BLwKzyYLamhJRZbLTYde1BpAHBAb96hQhU7SqXLSGKa3', name: 'Unknown Whale 2' },
        { address: 'ARjxTFWE1T1WsKJxKvG7ETkJ3kYEZLfC91wyYkNbwYXv', name: 'Jump Trading' },
        { address: '3yUDo43vdnJKqHLJBzXgLCqzFBsDZJ2hAjacVKGVJMUr', name: 'Alameda Research' },
        { address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', name: 'Marinade Staked SOL' },
        { address: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn', name: 'Jito Staked SOL' },
        { address: 'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1', name: 'BlazeStake Pool' },
        { address: '7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2', name: 'Orca Whirlpool' },
        { address: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', name: 'Raydium AMM V4' },
        { address: 'EFnVqfWKNFuDhaJNHeYSYKp1aCwLhmqQzz3wvJeA8eJH', name: 'Bybit Cold Wallet' },
        { address: '14kqryJUc9HKvgMUjN265z3vD9t8nFPAP7raQN3ePZBn', name: 'BitMEX' },
        { address: 'Dv8bBNQQWdnoJ2SmJ2aVaDWi5wPgLNBhqBhzjmX6SgAm', name: 'FTX Estate' },
        { address: 'BWe3inxV4gYKBdqMHS8UxN7AwNkhqNAaAfhcphw5baKp', name: 'Celsius Network' },
        { address: '8CvwxZ5A7RpKiDStjGMYkYt43NhcRPMtnKQQhdGX5PK9', name: 'Voyager Digital' },
        { address: '63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9', name: 'Genesis Trading' },
        { address: 'E7horS2PiJYYZWpC6tanp3VgMupeAwyaWQMvWKaWvGXz', name: 'Three Arrows Capital' }
    ];

    const verifiedWhales = [];
    walletsContainer.innerHTML = '<div class="loading-card"><div class="spinner"></div><p>Verifying whale wallets...</p></div>';
    
    for (const wallet of potentialWallets) {
        try {
            const response = await fetchWithFallback({
                jsonrpc: '2.0',
                id: 1,
                method: 'getBalance',
                params: [wallet.address]
            });
            
            const data = await response.json();
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
    
    verifiedWhales.sort((a, b) => b.balance - a.balance);
    
    let html = '';
    if (verifiedWhales.length > 0) {
        verifiedWhales.slice(0, 4).forEach((wallet, index) => {
            html += `
                <div class="wallet-card">
                    <div class="wallet-rank">#${index + 1}</div>
                    <div class="wallet-address">${wallet.name}</div>
                    <div class="wallet-stats">
                        <div class="wallet-stat">
                            <div class="wallet-stat-value">${wallet.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            <div class="wallet-stat-label">SOL Balance</div>
                        </div>
                        <div class="wallet-stat">
                            <div class="wallet-stat-value">${currencySymbols[selectedCurrency]}${(wallet.usdValue / 1000000).toFixed(1)}M</div>
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

async function fetchPopularTokens() {
    const tokensContainer = document.getElementById('popularTokens');
    
    const popularTokens = [
        { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', name: 'USD Coin', symbol: 'USDC' },
        { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', name: 'Tether', symbol: 'USDT' },
        { address: '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj', name: 'Lido Staked SOL', symbol: 'stSOL' },
        { address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', name: 'Marinade Staked SOL', symbol: 'mSOL' },
        { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', name: 'Bonk', symbol: 'BONK' },
        { address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', name: 'Jupiter', symbol: 'JUP' },
        { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', name: 'Dogwifhat', symbol: 'WIF' },
        { address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', name: 'Pyth Network', symbol: 'PYTH' }
    ];

    const verifiedTokens = [];
    tokensContainer.innerHTML = '<div class="loading-card"><div class="spinner"></div><p>Loading popular tokens...</p></div>';
    
    for (const token of popularTokens) {
        try {
            const response = await fetchWithFallback({
                jsonrpc: '2.0',
                id: 1,
                method: 'getTokenSupply',
                params: [token.address]
            });
            
            const data = await response.json();
            
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

function updateNetworkActivity() {
    updateValueWithAnimation('hourlyTx', networkStats.hourlyTransactions, v => v.toLocaleString());
    updateValueWithAnimation('peakTps', networkStats.peakTps, v => v.toLocaleString());
    
    if (blockTimes.length > 1) {
        const avgTime = blockTimes.reduce((a, b) => a + b, 0) / blockTimes.length;
        document.getElementById('avgBlockTime').textContent = `${avgTime.toFixed(1)}s`;
    } else {
        document.getElementById('avgBlockTime').textContent = '~0.4s';
    }
    
    const maxTps = 65000;
    const load = Math.min(100, (networkStats.tps / maxTps) * 100);
    document.getElementById('networkLoad').textContent = `${load.toFixed(1)}%`;
    
    if (typeof updateActivityChart === 'function') {
        updateActivityChart(load);
    }
}

let recentBigTransactions = [];

async function fetchBigTransactions() {
    const container = document.getElementById('bigTransactions');
    
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

        const data = await response.json();
        
        if (data.result?.transactions) {
            const now = Date.now();
            
            data.result.transactions.forEach(tx => {
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
                                blockTime: data.result.blockTime
                            });
                        }
                    }
                }
            });
            
            recentBigTransactions = recentBigTransactions.filter(tx => 
                now - tx.timestamp < 3600000
            );
            
            recentBigTransactions.sort((a, b) => b.amount - a.amount);
            
            let html = '';
            const topTransactions = recentBigTransactions.slice(0, 5);
            
            if (topTransactions.length === 0) {
                html = '<div class="loading-card"><p>Searching for large transactions...</p></div>';
            } else {
                topTransactions.forEach(tx => {
                    const timeAgo = getTimeAgo(tx.timestamp);
                    // Use the timestamp when we found the transaction, not the blockchain time
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
    } catch (error) {
        console.error('Error fetching big transactions:', error);
        container.innerHTML = '<div class="loading-card"><p>Unable to load large transactions</p></div>';
    }
}

function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 120) return '1 min ago';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 7200) return '1 hour ago';
    return `${Math.floor(seconds / 3600)} hours ago`;
}

function formatLocalTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
    });
}

function getUserTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

let lastBlockTime = Date.now();
function trackBlockTime() {
    const now = Date.now();
    const timeDiff = (now - lastBlockTime) / 1000;
    
    blockTimes.push(timeDiff);
    if (blockTimes.length > 10) {
        blockTimes.shift();
    }
    
    lastBlockTime = now;
    
    if (typeof updateBlockTimeChart === 'function') {
        const blockTimeMs = timeDiff * 1000;
        updateBlockTimeChart(blockTimeMs);
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
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
    
    const currencySelector = document.getElementById('currencySelector');
    if (currencySelector) {
        currencySelector.addEventListener('change', async (e) => {
            selectedCurrency = e.target.value;
            console.log(`Currency changed to ${selectedCurrency}`);
            
            await fetchNetworkStats();
            fetchTopWallets();
            
            localStorage.setItem('preferredCurrency', selectedCurrency);
        });
        
        const savedCurrency = localStorage.getItem('preferredCurrency');
        if (savedCurrency && currencySymbols[savedCurrency]) {
            selectedCurrency = savedCurrency;
            currencySelector.value = savedCurrency;
            console.log(`Using saved currency preference: ${savedCurrency}`);
        }
    }
    
    await fetchNetworkStats();
    
    fetchLiveTransactions();
    fetchTopWallets();
    fetchPopularTokens();
    fetchBigTransactions();
    
    startCountdown();
    
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
});

console.log('Solanalysis by Jeffrey Goh - Live Blockchain Analysis');
