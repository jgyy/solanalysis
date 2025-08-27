# Solanalysis

Real-time Solana blockchain analytics dashboard with ultra-low-cost deployment on AWS.

## 🚀 Features

- **Real-time TPS monitoring** - Live transactions per second tracking
- **Price tracking** - SOL price in multiple currencies with auto-detection
- **Transaction analysis** - Live transaction feed with type classification
- **Network statistics** - Validator count, block height, network activity
- **Whale watching** - Top wallet tracking with real-time balances
- **Enhanced caching** - Multi-layer caching for instant chart loading
- **Cost optimized** - Deployed on AWS Lightsail for ~$3.50/month

## 💰 Cost Breakdown

**AWS Lightsail Nano Instance (Singapore)**: ~$3.50/month
- 512MB RAM, 1 vCPU, 20GB SSD
- Includes networking, load balancing capabilities
- Free SSL certificates via Let's Encrypt
- Perfect for low-traffic applications

## 🏗️ Architecture

- **Frontend**: TypeScript + Chart.js + Nginx
- **Backend**: Node.js + Express + Enhanced caching
- **Infrastructure**: AWS CDK (TypeScript) + Lightsail
- **Deployment**: Docker containers with auto-deployment
- **Region**: Singapore (ap-southeast-1) for optimal latency

## 📦 Quick Deployment

### Prerequisites

1. **AWS CLI** configured with credentials
2. **Docker** for containerization
3. **Node.js 20+** with npm
4. **Git** for version control

### Deploy to AWS (Ultra Low Cost)

```bash
# 1. Build everything
npm run build

# 2. Bootstrap CDK in Singapore region
cd packages/infrastructure
npm run bootstrap:singapore

# 3. Deploy Lightsail stack (ultra-low cost)
npm run deploy:lightsail
```

**With custom domain:**
```bash
# Set environment variables first
export DOMAIN_NAME="your-domain.com"
export ENVIRONMENT="prod"
export SSH_KEY_NAME="your-key-name"

# Then deploy
npm run build
cd packages/infrastructure
npm run bootstrap:singapore
npm run deploy:lightsail
```

### Environment Configuration

Create a `.env` file with your configuration:

```bash
# === DEPLOYMENT CONFIGURATION ===
ENVIRONMENT=prod
AWS_REGION=ap-southeast-1

# === DOMAIN CONFIGURATION ===
# Optional: Configure your custom domain
DOMAIN_NAME=
ENABLE_HTTPS=true

# === SSH CONFIGURATION ===
# SSH key name in AWS Lightsail (optional)
SSH_KEY_NAME=solanalysis-key

# === DOCKER REGISTRY CONFIGURATION ===
# Optional: Configure ECR or Docker Hub registry for production
ECR_REGISTRY=

# === APPLICATION CONFIGURATION ===
NODE_ENV=production
PORT=3000

# === CDK CONFIGURATION ===
CDK_DEFAULT_ACCOUNT=
CDK_DEFAULT_REGION=ap-southeast-1
```

### Manual Deployment Steps

```bash
# 1. Install dependencies
npm install

# 2. Build the application
npm run build

# 3. Build Docker images
docker build -f packages/backend/Dockerfile -t solanalysis/backend:latest .
docker build -f packages/frontend/Dockerfile -t solanalysis/frontend:latest .

# 4. Deploy infrastructure
cd packages/infrastructure
npm run bootstrap:singapore
npm run deploy:lightsail
```

## 🔧 Development

### Local Development

```bash
# Install dependencies
npm install

# Start backend (port 3000)
npm run dev:backend

# Start frontend (port 5000)
npm run dev:frontend
```

### Project Structure

```
solanalysis/
├── packages/
│   ├── backend/           # Node.js API server
│   │   ├── src/
│   │   │   └── server.ts  # Enhanced caching server
│   │   └── Dockerfile
│   ├── frontend/          # TypeScript frontend
│   │   ├── src/
│   │   │   ├── app.ts     # Main application
│   │   │   └── charts.ts  # Chart management
│   │   ├── public/        # Static assets
│   │   └── Dockerfile
│   └── infrastructure/    # AWS CDK (TypeScript)
│       ├── src/
│       │   ├── lightsail-stack.ts    # Ultra-low cost deployment
│       │   └── lightsail-app.ts      # Main entry point
│       └── cdk.json
└── docker-compose.yml    # Local development
```

## 🎯 Deployment Option

### AWS Lightsail (~$3.50/month) ⭐ **ULTRA-LOW COST**
- Single nano instance in Singapore
- Perfect for low traffic applications
- Automatic SSL via Let's Encrypt
- Simple deployment and management
- Fixed monthly pricing - no surprises

## 📊 Features Deep Dive

### Enhanced Caching System
- **Backend**: 7-day cache duration with persistent storage
- **Frontend**: localStorage backup for instant loading
- **Multi-layer fallback**: Memory → Persistent → localStorage
- **200 data points** per chart (3x increase from original)
- **No data loss** during server restarts

### Real-time Analytics
- Live TPS monitoring with historical trends
- Multi-currency price tracking with auto-detection
- Transaction type classification (Transfer, Swap, DeFi, etc.)
- Network activity percentage calculation
- Large transaction tracking (>10 SOL)

### Cost Optimizations
- Fixed-price Lightsail instance (predictable costs)
- Minimal log retention (3 days) 
- Efficient Docker multi-stage builds
- No load balancer costs
- Automatic SSL certificates (free)

## 🌐 Domain Setup

1. **Purchase a domain** (optional)
2. **Set environment variables and deploy**:
   ```bash
   export DOMAIN_NAME="yourdomain.com"
   npm run build
   cd packages/infrastructure
   npm run deploy:lightsail
   ```
3. **Configure DNS**: Point your domain A record to the provided IP
4. **SSL**: Automatically configured via Let's Encrypt

## 🔑 SSH Access

1. **Generate SSH key** in AWS Lightsail console
2. **Download key pair**
3. **Connect**:
   ```bash
   ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_IP
   ```

## 🔍 Monitoring

- **Health checks**: `/health` endpoint
- **Auto-restart**: Failed containers restart automatically
- **Log rotation**: 10MB max, 3 files retained
- **Monitoring script**: Runs every 5 minutes

## 📈 Scaling

### Vertical Scaling (Lightsail)
Upgrade to larger instance sizes as traffic grows:
- **Nano**: $3.50/month (512MB RAM) ← **Current**
- **Micro**: $5/month (1GB RAM)
- **Small**: $10/month (2GB RAM)
- **Medium**: $20/month (4GB RAM)
- **Large**: $40/month (8GB RAM)

## 🛠️ Troubleshooting

### Common Issues

**Deployment fails:**
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify region
aws configure get region
```

**Application not accessible:**
```bash
# Check container status
docker ps

# Check logs
docker logs solanalysis-frontend
docker logs solanalysis-backend
```

### Support Commands

```bash
# View deployment status
aws cloudformation describe-stacks --region ap-southeast-1 --stack-name SolanalysisLightsail-prod

# SSH into instance
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_IP

# View application logs
sudo docker logs -f solanalysis-frontend
sudo docker logs -f solanalysis-backend

# Restart application
cd /opt/solanalysis
sudo docker-compose restart
```

## Author

Jeffrey Goh

## License

MIT
