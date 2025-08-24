# Solanalysis

Blockchain analysis website for Solana network

## Quick Start

```bash
npm install
npm start
# Visit http://localhost:3000
```

## Docker

### Build & Run
```bash
docker compose up --build
```

### Run in background
```bash
docker compose up -d
```

### Stop
```bash
docker compose down
```

### Remove with volumes
```bash
docker compose down -v
```

## Docker Commands

```bash
# Build only
docker build -t solanalysis:latest .

# Run manually
docker run -d -p 3000:3000 --name solanalysis solanalysis:latest

# View logs
docker logs -f solanalysis-app

# Shell access
docker exec -it solanalysis-app sh

# Stats
docker stats solanalysis-app

# Cleanup
docker stop solanalysis-app
docker rm solanalysis-app
docker rmi solanalysis:latest
```

## Cloud Deployment

### AWS ECS
```bash
docker tag solanalysis:latest YOUR_ECR_URI
docker push YOUR_ECR_URI
```

## Development

```bash
# Install dependencies
npm install

# Run locally
npm start

# With custom port
PORT=8080 npm start
```

## Update

```bash
git pull
docker-compose down
docker-compose up --build -d
```

## RPC API Keys

Get free API keys from:
- Helius: https://helius.dev
- Alchemy: https://www.alchemy.com
- QuickNode: https://www.quicknode.com

Update in `server.js`:
```javascript
const RPC_ENDPOINTS = [
    'https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY',
    // ...
];
```

## Author

Jeffrey Goh

## License

MIT
