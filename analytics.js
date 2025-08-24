let tpsHistory = [];
let priceHistory = [];
let txTypeStats = {
    Transfer: 0,
    Swap: 0,
    NFT: 0,
    Token: 0,
    DeFi: 0,
    Stake: 0,
    Vote: 0,
    Other: 0
};
let activityData = [];
let volumeHistory = [];
let blockTimeData = [];
let feeData = [];

const MAX_DATA_POINTS = 60;

let tpsChart, txTypesChart, priceChart, activityChart, blockTimeChart, feeChart;

function initCharts() {
    const chartDefaults = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim()
                }
            }
        }
    };

    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim();
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();

    const tpsCtx = document.getElementById('tpsChart').getContext('2d');
    tpsChart = new Chart(tpsCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Transactions Per Second',
                data: [],
                borderColor: '#14F195',
                backgroundColor: 'rgba(20, 241, 149, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            ...chartDefaults,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor
                    }
                },
                x: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 10
                    }
                }
            }
        }
    });

    const txTypesCtx = document.getElementById('txTypesChart').getContext('2d');
    txTypesChart = new Chart(txTypesCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(txTypeStats),
            datasets: [{
                data: Object.values(txTypeStats),
                backgroundColor: [
                    '#14F195',
                    '#9945FF',
                    '#00D4FF',
                    '#FFD700',
                    '#FF6B6B',
                    '#4ECDC4',
                    '#95E77E',
                    '#FFB6C1'
                ],
                borderWidth: 0
            }]
        },
        options: {
            ...chartDefaults,
            plugins: {
                ...chartDefaults.plugins,
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    const priceCtx = document.getElementById('priceChart').getContext('2d');
    priceChart = new Chart(priceCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'SOL Price',
                data: [],
                borderColor: '#9945FF',
                backgroundColor: 'rgba(153, 69, 255, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            ...chartDefaults,
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            return currencySymbols[selectedCurrency] + value.toFixed(2);
                        }
                    }
                },
                x: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 10
                    }
                }
            }
        }
    });

    const activityCtx = document.getElementById('activityChart').getContext('2d');
    activityChart = new Chart(activityCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Network Activity',
                data: [],
                backgroundColor: function(context) {
                    if (!context.parsed || context.parsed.y === undefined) {
                        return 'rgba(20, 241, 149, 0.5)';
                    }
                    const value = context.parsed.y;
                    const alpha = Math.min(1, Math.max(0.1, value / 100));
                    return `rgba(20, 241, 149, ${alpha})`;
                },
                borderColor: '#14F195',
                borderWidth: 1
            }]
        },
        options: {
            ...chartDefaults,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 12
                    }
                }
            }
        }
    });

    const blockTimeCtx = document.getElementById('blockTimeChart').getContext('2d');
    blockTimeChart = new Chart(blockTimeCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Block Time (ms)',
                data: [],
                borderColor: '#00D4FF',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            ...chartDefaults,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            return value + 'ms';
                        }
                    }
                },
                x: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 10
                    }
                }
            }
        }
    });

    const feeCtx = document.getElementById('feeChart').getContext('2d');
    feeChart = new Chart(feeCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Average Fee',
                data: [],
                borderColor: '#FFD700',
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                yAxisID: 'y'
            }, {
                label: 'Max Fee',
                data: [],
                borderColor: '#FF6B6B',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: false,
                yAxisID: 'y'
            }]
        },
        options: {
            ...chartDefaults,
            scales: {
                y: {
                    beginAtZero: true,
                    position: 'left',
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        callback: function(value) {
                            return value.toFixed(6) + ' SOL';
                        }
                    }
                },
                x: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 10
                    }
                }
            }
        }
    });
}

function updateTPSChart(tps) {
    if (!tpsChart) {
        console.log('TPS chart not initialized yet');
        return;
    }
    
    const now = new Date();
    const timeLabel = now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    tpsHistory.push({ time: timeLabel, value: tps });
    if (tpsHistory.length > MAX_DATA_POINTS) {
        tpsHistory.shift();
    }

    tpsChart.data.labels = tpsHistory.map(h => h.time);
    tpsChart.data.datasets[0].data = tpsHistory.map(h => h.value);
    tpsChart.update('none');
}

function updateTxTypesChart(type) {
    if (!txTypesChart) {
        console.log('Transaction types chart not initialized yet');
        return;
    }
    
    if (txTypeStats[type] !== undefined) {
        txTypeStats[type]++;
    } else {
        txTypeStats.Other++;
    }

    txTypesChart.data.datasets[0].data = Object.values(txTypeStats);
    txTypesChart.update('none');
}

function updatePriceChart(price) {
    if (!priceChart) {
        console.log('Price chart not initialized yet');
        return;
    }
    
    const now = new Date();
    const timeLabel = now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
    });

    priceHistory.push({ time: timeLabel, value: price });
    if (priceHistory.length > MAX_DATA_POINTS) {
        priceHistory.shift();
    }

    priceChart.data.labels = priceHistory.map(h => h.time);
    priceChart.data.datasets[0].data = priceHistory.map(h => h.value);
    priceChart.update('none');
}

function updateActivityChart(load) {
    if (!activityChart) {
        console.log('Activity chart not initialized yet');
        return;
    }
    
    const now = new Date();
    const timeLabel = now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
    });

    activityData.push({ time: timeLabel, value: load });
    if (activityData.length > 24) {
        activityData.shift();
    }

    activityChart.data.labels = activityData.map(h => h.time);
    activityChart.data.datasets[0].data = activityData.map(h => h.value);
    activityChart.update('none');
}

function updateBlockTimeChart(blockTime) {
    if (!blockTimeChart) {
        console.log('Block time chart not initialized yet');
        return;
    }
    
    const now = new Date();
    const timeLabel = now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
    });

    blockTimeData.push({ time: timeLabel, value: blockTime });
    if (blockTimeData.length > MAX_DATA_POINTS) {
        blockTimeData.shift();
    }

    blockTimeChart.data.labels = blockTimeData.map(h => h.time);
    blockTimeChart.data.datasets[0].data = blockTimeData.map(h => h.value);
    blockTimeChart.update('none');
}

function updateFeeChart(avgFee, maxFee) {
    if (!feeChart) {
        console.log('Fee chart not initialized yet');
        return;
    }
    
    const now = new Date();
    const timeLabel = now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
    });

    feeData.push({ time: timeLabel, avg: avgFee, max: maxFee });
    if (feeData.length > MAX_DATA_POINTS) {
        feeData.shift();
    }

    feeChart.data.labels = feeData.map(h => h.time);
    feeChart.data.datasets[0].data = feeData.map(h => h.avg);
    feeChart.data.datasets[1].data = feeData.map(h => h.max);
    feeChart.update('none');
}

let totalTransactions = 0;
let successfulTransactions = 0;
let totalVolume = 0;
let transactionSizes = [];
let activePrograms = new Set();
let recentFees = [];

function updateAnalyticsStats(tx) {
    totalTransactions++;
    
    if (tx && !tx.error) {
        successfulTransactions++;
    }

    const txSize = parseFloat(tx?.amount || 0);
    if (txSize > 0) {
        transactionSizes.push(txSize);
        totalVolume += txSize;
    }

    if (tx?.program) {
        activePrograms.add(tx.program);
    }

    const avgSize = transactionSizes.length > 0 
        ? transactionSizes.reduce((a, b) => a + b, 0) / transactionSizes.length 
        : 0;

    document.getElementById('avgTxSize').textContent = `${avgSize.toFixed(2)} SOL`;
    
    const successRate = totalTransactions > 0 
        ? (successfulTransactions / totalTransactions * 100).toFixed(1) 
        : 0;
    document.getElementById('successRate').textContent = `${successRate}%`;
    
    document.getElementById('activePrograms').textContent = activePrograms.size.toLocaleString();
    
    document.getElementById('totalVolume').textContent = `${totalVolume.toLocaleString(undefined, {
        maximumFractionDigits: 0
    })} SOL`;

    if (transactionSizes.length > 100) {
        transactionSizes = transactionSizes.slice(-100);
    }
}

function updateChartsTheme() {
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim();

    [tpsChart, txTypesChart, priceChart, activityChart, blockTimeChart, feeChart].forEach(chart => {
        if (chart) {
            if (chart.options.plugins?.legend?.labels) {
                chart.options.plugins.legend.labels.color = textColor;
            }
            if (chart.options.scales?.x) {
                chart.options.scales.x.ticks.color = textColor;
                chart.options.scales.x.grid.color = gridColor;
            }
            if (chart.options.scales?.y) {
                chart.options.scales.y.ticks.color = textColor;
                chart.options.scales.y.grid.color = gridColor;
            }
            chart.update('none');
        }
    });
}

let chartsInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initCharts();
        chartsInitialized = true;
    }, 500);
});

const originalToggleTheme = window.toggleTheme;
window.toggleTheme = function() {
    if (originalToggleTheme) originalToggleTheme();
    setTimeout(updateChartsTheme, 100);
};