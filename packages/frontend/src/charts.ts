import { 
    Chart,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    LineController,
    BarElement,
    BarController,
    ArcElement,
    DoughnutController,
    PieController,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import type { 
  ChartDataPoint, 
  FeeDataPoint, 
  TransactionTypeStats,
  TransactionType
} from '@solanalysis/shared';

Chart.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    LineController,
    BarElement,
    BarController,
    ArcElement,
    DoughnutController,
    PieController,
    Title,
    Tooltip,
    Legend,
    Filler
);

let tpsHistory: ChartDataPoint[] = [];
let priceHistory: ChartDataPoint[] = [];
let txTypeStats: TransactionTypeStats = {
    Transfer: 0,
    Swap: 0,
    NFT: 0,
    Token: 0,
    DeFi: 0,
    Stake: 0,
    Vote: 0,
    Other: 0
};
let activityData: ChartDataPoint[] = [];
let blockTimeData: ChartDataPoint[] = [];
let feeData: FeeDataPoint[] = [];

const MAX_DATA_POINTS = 60;

let tpsChart: Chart | null = null;
let txTypesChart: Chart | null = null;
let priceChart: Chart | null = null;
let activityChart: Chart | null = null;
let blockTimeChart: Chart | null = null;
let feeChart: Chart | null = null;

function initCharts(): void {
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDarkMode ? '#ffffff' : '#1a1a1a';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    const chartDefaults = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: textColor
                }
            },
            tooltip: {
                backgroundColor: isDarkMode ? '#141332' : '#ffffff',
                titleColor: textColor,
                bodyColor: textColor,
                borderColor: isDarkMode ? '#2a2f4a' : '#e0e0e0',
                borderWidth: 1
            }
        }
    };

    const tpsCtx = document.getElementById('tpsChart') as HTMLCanvasElement;
    if (tpsCtx) {
        tpsChart = new Chart(tpsCtx.getContext('2d')!, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Transactions Per Second',
                    data: [],
                    borderColor: isDarkMode ? '#14F195' : '#00D632',
                    backgroundColor: isDarkMode ? 'rgba(20, 241, 149, 0.1)' : 'rgba(0, 214, 50, 0.1)',
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
    }

    const txTypesCtx = document.getElementById('txTypesChart') as HTMLCanvasElement;
    if (txTypesCtx) {
        txTypesChart = new Chart(txTypesCtx.getContext('2d')!, {
            type: 'doughnut',
            data: {
                labels: Object.keys(txTypeStats),
                datasets: [{
                    data: Object.values(txTypeStats),
                    backgroundColor: [
                        isDarkMode ? '#14F195' : '#00D632',
                        isDarkMode ? '#9945FF' : '#7B3FF2',
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
                        backgroundColor: isDarkMode ? '#141332' : '#ffffff',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: isDarkMode ? '#2a2f4a' : '#e0e0e0',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    const priceCtx = document.getElementById('priceChart') as HTMLCanvasElement;
    if (priceCtx) {
        priceChart = new Chart(priceCtx.getContext('2d')!, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'SOL Price',
                    data: [],
                    borderColor: isDarkMode ? '#9945FF' : '#7B3FF2',
                    backgroundColor: isDarkMode ? 'rgba(153, 69, 255, 0.1)' : 'rgba(123, 63, 242, 0.1)',
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
                                const selectedCurrency = (window as any).selectedCurrency || 'USD';
                                const currencySymbols = (window as any).currencySymbols || { USD: '$' };
                                return currencySymbols[selectedCurrency] + (value as number).toFixed(2);
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

    const activityCtx = document.getElementById('activityChart') as HTMLCanvasElement;
    if (activityCtx) {
        const currentIsDarkMode = isDarkMode;
        activityChart = new Chart(activityCtx.getContext('2d')!, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Network Activity',
                    data: [],
                    backgroundColor: function(context) {
                        if (!context.parsed || context.parsed.y === undefined) {
                            return currentIsDarkMode ? 'rgba(20, 241, 149, 0.5)' : 'rgba(0, 214, 50, 0.5)';
                        }
                        const value = context.parsed.y;
                        const alpha = Math.min(1, Math.max(0.1, value / 100));
                        return currentIsDarkMode ? `rgba(20, 241, 149, ${alpha})` : `rgba(0, 214, 50, ${alpha})`;
                    },
                    borderColor: currentIsDarkMode ? '#14F195' : '#00D632',
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
    }

    const blockTimeCtx = document.getElementById('blockTimeChart') as HTMLCanvasElement;
    if (blockTimeCtx) {
        blockTimeChart = new Chart(blockTimeCtx.getContext('2d')!, {
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
    }

    const feeCtx = document.getElementById('feeChart') as HTMLCanvasElement;
    if (feeCtx) {
        feeChart = new Chart(feeCtx.getContext('2d')!, {
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
                                return (value as number).toFixed(6) + ' SOL';
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
}

function updateTPSChart(tps: number): void {
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

function updateTxTypesChart(type: TransactionType | string): void {
    if (!txTypesChart) {
        console.log('Transaction types chart not initialized yet');
        return;
    }
    
    if (type in txTypeStats) {
        txTypeStats[type as TransactionType]++;
    } else {
        txTypeStats.Other++;
    }

    txTypesChart.data.datasets[0].data = Object.values(txTypeStats);
    txTypesChart.update('none');
}

function updatePriceChart(price: number): void {
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

function updateActivityChart(load: number): void {
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

function updateBlockTimeChart(blockTime: number): void {
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

function updateFeeChart(avgFee: number, maxFee: number): void {
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
let transactionSizes: number[] = [];
let activePrograms = new Set<string>();
// let recentFees: number[] = []; // Reserved for future use

interface TransactionData {
    error?: boolean;
    amount?: string | number;
    program?: string;
}

function updateAnalyticsStats(tx: TransactionData): void {
    totalTransactions++;
    
    if (tx && !tx.error) {
        successfulTransactions++;
    }

    const txSize = parseFloat(String(tx?.amount || 0));
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

    const avgTxSizeElem = document.getElementById('avgTxSize');
    if (avgTxSizeElem) avgTxSizeElem.textContent = `${avgSize.toFixed(2)} SOL`;
    
    const successRate = totalTransactions > 0 
        ? (successfulTransactions / totalTransactions * 100).toFixed(1) 
        : '0';
    const successRateElem = document.getElementById('successRate');
    if (successRateElem) successRateElem.textContent = `${successRate}%`;
    
    const activeProgramsElem = document.getElementById('activePrograms');
    if (activeProgramsElem) activeProgramsElem.textContent = activePrograms.size.toLocaleString();
    
    const totalVolumeElem = document.getElementById('totalVolume');
    if (totalVolumeElem) {
        totalVolumeElem.textContent = `${totalVolume.toLocaleString(undefined, {
            maximumFractionDigits: 0
        })} SOL`;
    }

    if (transactionSizes.length > 100) {
        transactionSizes = transactionSizes.slice(-100);
    }
}

function destroyAllCharts(): void {
    if (tpsChart) {
        tpsChart.destroy();
        tpsChart = null;
    }
    if (txTypesChart) {
        txTypesChart.destroy();
        txTypesChart = null;
    }
    if (priceChart) {
        priceChart.destroy();
        priceChart = null;
    }
    if (activityChart) {
        activityChart.destroy();
        activityChart = null;
    }
    if (blockTimeChart) {
        blockTimeChart.destroy();
        blockTimeChart = null;
    }
    if (feeChart) {
        feeChart.destroy();
        feeChart = null;
    }
}

function reinitializeChartsForTheme(): void {
    destroyAllCharts();
    
    setTimeout(() => {
        initCharts();
        
        if (tpsChart && tpsHistory.length > 0) {
            tpsChart.data.labels = tpsHistory.map(h => h.time);
            tpsChart.data.datasets[0].data = tpsHistory.map(h => h.value);
            tpsChart.update('none');
        }
        
        if (txTypesChart) {
            txTypesChart.data.datasets[0].data = Object.values(txTypeStats);
            txTypesChart.update('none');
        }
        
        if (priceChart && priceHistory.length > 0) {
            priceChart.data.labels = priceHistory.map(h => h.time);
            priceChart.data.datasets[0].data = priceHistory.map(h => h.value);
            priceChart.update('none');
        }
        
        if (activityChart && activityData.length > 0) {
            activityChart.data.labels = activityData.map(h => h.time);
            activityChart.data.datasets[0].data = activityData.map(h => h.value);
            activityChart.update('none');
        }
        
        if (blockTimeChart && blockTimeData.length > 0) {
            blockTimeChart.data.labels = blockTimeData.map(h => h.time);
            blockTimeChart.data.datasets[0].data = blockTimeData.map(h => h.value);
            blockTimeChart.update('none');
        }
        
        if (feeChart && feeData.length > 0) {
            feeChart.data.labels = feeData.map(h => h.time);
            feeChart.data.datasets[0].data = feeData.map(h => h.avg);
            feeChart.data.datasets[1].data = feeData.map(h => h.max);
            feeChart.update('none');
        }
    }, 50);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        initCharts();
    }, 500);
});

(window as any).updateTPSChart = updateTPSChart;
(window as any).updateTxTypesChart = updateTxTypesChart;
(window as any).updatePriceChart = updatePriceChart;
(window as any).updateActivityChart = updateActivityChart;
(window as any).updateBlockTimeChart = updateBlockTimeChart;
(window as any).updateFeeChart = updateFeeChart;
(window as any).updateAnalyticsStats = updateAnalyticsStats;
window.reinitializeChartsForTheme = reinitializeChartsForTheme;
