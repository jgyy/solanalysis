const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';

let networkStats = {
    tps: 0,
    blockHeight: 0,
    solPrice: 0,
    validators: 0,
    peakTps: 0,
    hourlyTransactions: 0,
    totalAnalyzed: 0
};

let blockTimes = [];

async function fetchNetworkStats() {
    try {
        const [perfResponse, blockResponse, priceResponse, validatorResponse] = await Promise.all([
            fetch(SOLANA_RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getRecentPerformanceSamples',
                    params: [1]
                })
            }),
            fetch(SOLANA_RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 2,
                    method: 'getBlockHeight',
                    params: []
                })
            }),
            fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'),
            fetch(SOLANA_RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 3,
                    method: 'getVoteAccounts',
                    params: []
                })
            })
        ]);

        const [perfData, blockData, priceData, validatorData] = await Promise.all([
            perfResponse.json(),
            blockResponse.json(),
            priceResponse.json(),
            validatorResponse.json()
        ]);

        if (perfData.result?.[0]) {
            const tps = Math.round(perfData.result[0].numTransactions / perfData.result[0].samplePeriodSecs);
            networkStats.tps = tps;
            networkStats.peakTps = Math.max(networkStats.peakTps, tps);
            networkStats.hourlyTransactions += perfData.result[0].numTransactions;
            document.getElementById('networkTps').textContent = tps.toLocaleString();
        }

        if (blockData.result) {
            networkStats.blockHeight = blockData.result;
            document.getElementById('blockHeight').textContent = blockData.result.toLocaleString();
        }

        if (priceData.solana) {
            networkStats.solPrice = priceData.solana.usd;
            document.getElementById('solPrice').textContent = `$${priceData.solana.usd.toFixed(2)}`;
        }

        if (validatorData.result) {
            networkStats.validators = validatorData.result.current.length;
            document.getElementById('validators').textContent = validatorData.result.current.length;
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
        const blockToFetch = networkStats.blockHeight - Math.floor(Math.random() * 3);
        
        const response = await fetch(SOLANA_RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
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
            })
        });

        const data = await response.json();
        const tbody = document.getElementById('liveTxFeed');

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

                const blockTime = data.result.blockTime;
                const time = blockTime ? new Date(blockTime * 1000).toLocaleTimeString() : new Date().toLocaleTimeString();
                const fee = tx.meta ? (tx.meta.fee / 1000000000).toFixed(6) : '0';
                const status = tx.meta?.err ? 'Failed' : 'Success';
                const type = detectTransactionType(tx);
                const amount = calculateTransactionAmount(tx);

                const row = document.createElement('tr');
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
    
    // Check parsed instructions if available
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
    
    // Check program IDs
    const programIds = accountKeys.map(key => key.pubkey || key).filter(Boolean);
    const programString = programIds.join(' ');
    
    // Known program IDs
    if (programString.includes('Vote111111111111111111111111111111111111111')) return 'Vote';
    if (programString.includes('Stake11111111111111111111111111111111111111')) return 'Stake';
    if (programString.includes('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')) return 'Token';
    if (programString.includes('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')) return 'NFT';
    if (programString.includes('9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP')) return 'Swap';
    if (programString.includes('JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB')) return 'Swap';
    
    // Check balance changes to determine transfer type
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
    
    const knownWallets = [
        { address: 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB', name: 'Jupiter Exchange' },
        { address: 'CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq', name: 'Raydium Protocol' },
        { address: 'So11111111111111111111111111111111111111112', name: 'Wrapped SOL Program' },
        { address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', name: 'Token Program' }
    ];

    let html = '';
    for (let i = 0; i < knownWallets.length; i++) {
        const wallet = knownWallets[i];
        
        try {
            const response = await fetch(SOLANA_RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getBalance',
                    params: [wallet.address]
                })
            });
            
            const data = await response.json();
            const balance = data.result ? (data.result.value / 1000000000).toFixed(2) : 0;
            
            html += `
                <div class="wallet-card">
                    <div class="wallet-rank">#${i + 1}</div>
                    <div class="wallet-address">${wallet.name}</div>
                    <div class="wallet-stats">
                        <div class="wallet-stat">
                            <div class="wallet-stat-value">${balance}</div>
                            <div class="wallet-stat-label">SOL Balance</div>
                        </div>
                        <div class="wallet-stat">
                            <div class="wallet-stat-value">$${(balance * networkStats.solPrice).toFixed(0)}</div>
                            <div class="wallet-stat-label">USD Value</div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error fetching wallet:', error);
        }
    }
    
    walletsContainer.innerHTML = html || '<div class="loading-card"><p>Unable to load wallet data</p></div>';
}

async function fetchPopularTokens() {
    const tokensContainer = document.getElementById('popularTokens');
    
    const popularTokens = [
        { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', name: 'USDC', symbol: 'USDC' },
        { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', name: 'USDT', symbol: 'USDT' },
        { address: 'So11111111111111111111111111111111111111112', name: 'Wrapped SOL', symbol: 'wSOL' },
        { address: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', name: 'Ether (Portal)', symbol: 'ETH' }
    ];

    let html = '';
    for (let i = 0; i < popularTokens.length; i++) {
        const token = popularTokens[i];
        
        try {
            const response = await fetch(SOLANA_RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getTokenSupply',
                    params: [token.address]
                })
            });
            
            const data = await response.json();
            let supply = 'N/A';
            
            if (data.result?.value) {
                const amount = parseFloat(data.result.value.amount);
                const decimals = data.result.value.decimals;
                supply = (amount / Math.pow(10, decimals)).toLocaleString(undefined, {
                    maximumFractionDigits: 0
                });
            }
            
            html += `
                <div class="token-card">
                    <div class="token-rank">#${i + 1}</div>
                    <div class="token-name">${token.name} (${token.symbol})</div>
                    <div class="token-stats">
                        <div class="token-stat">
                            <div class="token-stat-value">${supply}</div>
                            <div class="token-stat-label">Total Supply</div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error fetching token:', error);
        }
    }
    
    tokensContainer.innerHTML = html || '<div class="loading-card"><p>Unable to load token data</p></div>';
}

function updateNetworkActivity() {
    document.getElementById('hourlyTx').textContent = networkStats.hourlyTransactions.toLocaleString();
    document.getElementById('peakTps').textContent = networkStats.peakTps.toLocaleString();
    
    if (blockTimes.length > 1) {
        const avgTime = blockTimes.reduce((a, b) => a + b, 0) / blockTimes.length;
        document.getElementById('avgBlockTime').textContent = `${avgTime.toFixed(1)}s`;
    } else {
        document.getElementById('avgBlockTime').textContent = '~0.4s';
    }
    
    const maxTps = 65000;
    const load = Math.min(100, (networkStats.tps / maxTps) * 100);
    document.getElementById('networkLoad').textContent = `${load.toFixed(1)}%`;
}

let recentBigTransactions = [];

async function fetchBigTransactions() {
    const container = document.getElementById('bigTransactions');
    
    try {
        const response = await fetch(SOLANA_RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getBlock',
                params: [
                    networkStats.blockHeight - Math.floor(Math.random() * 10),
                    {
                        encoding: 'json',
                        transactionDetails: 'full',
                        rewards: false,
                        maxSupportedTransactionVersion: 0
                    }
                ]
            })
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
                                <div class="big-tx-details">${timeAgo}</div>
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

let lastBlockTime = Date.now();
function trackBlockTime() {
    const now = Date.now();
    const timeDiff = (now - lastBlockTime) / 1000;
    
    blockTimes.push(timeDiff);
    if (blockTimes.length > 10) {
        blockTimes.shift();
    }
    
    lastBlockTime = now;
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initial load
    await fetchNetworkStats();
    
    // Start fetching other data
    fetchLiveTransactions();
    fetchTopWallets();
    fetchPopularTokens();
    fetchBigTransactions();
    
    // Regular updates - every 3 seconds
    setInterval(() => {
        fetchNetworkStats();
        fetchLiveTransactions();
        fetchBigTransactions();
        trackBlockTime();
    }, 3000);
    
    // Less frequent updates - every 30 seconds
    setInterval(() => {
        fetchTopWallets();
        fetchPopularTokens();
    }, 30000);
});

console.log('Solanalysis by Jeffrey Goh - Live Blockchain Analysis');
