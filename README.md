# Solanalysis - Blockchain Analysis Website

A comprehensive blockchain analysis tool for the Solana network, providing real-time network statistics, wallet analysis, transaction tracking, and token exploration.

## Features

- **Real-time Network Statistics**: Monitor TPS, block height, SOL price, and validator count
- **Wallet Analysis**: Analyze any Solana wallet address to view balance, tokens, and transaction history
- **Transaction Explorer**: Look up and analyze any transaction by its signature
- **Token Explorer**: Get detailed information about any SPL token including supply and top holders
- **Interactive Charts**: Visualize network activity with real-time updating charts
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Technologies Used

- HTML5, CSS3, JavaScript (Vanilla)
- Chart.js for data visualization
- Solana RPC API for blockchain data
- CoinGecko API for price data
- Font Awesome for icons

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/solanalysis.git
cd solanalysis
```

2. Start a local server:
```bash
npm start
```
Or using Python:
```bash
python -m http.server 8000
```

3. Open your browser and navigate to:
```
http://localhost:8000
```

## Project Structure

```
solanalysis/
├── index.html        # Main dashboard page
├── charts.html       # Analytics and charts page
├── styles.css        # Global styles
├── app.js           # Main application logic
├── package.json     # Project metadata
├── LICENSE          # MIT License
├── README.md        # This file
└── .gitattributes   # Git attributes configuration
```

## API Usage

The application uses the following APIs:
- **Solana RPC API**: For blockchain data (mainnet-beta)
- **CoinGecko API**: For SOL price data
- **Helius API**: Optional enhanced data (requires API key)

## Features in Detail

### Dashboard
- Live network statistics updated every 30 seconds
- Recent block information updated every 10 seconds
- Quick access to all analysis tools

### Wallet Analysis
- View SOL balance and USD value
- Count of token accounts
- Recent transaction history
- NFT holdings (when available)

### Transaction Explorer
- Detailed transaction information
- Success/failure status
- Fee information
- Balance changes for involved accounts
- Instruction details

### Token Explorer
- Total supply and decimals
- Top token holders
- Token program information (Token or Token-2022)

### Charts & Analytics
- Real-time TPS monitoring
- Block production rate
- SOL price history
- Network activity distribution

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Jeffrey Goh**

## Acknowledgments

- Solana Foundation for the blockchain infrastructure
- Chart.js for visualization library
- CoinGecko for price data API