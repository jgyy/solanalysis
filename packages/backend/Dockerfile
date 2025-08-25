FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from monorepo root and packages
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
COPY packages/frontend/package*.json ./packages/frontend/
COPY packages/infrastructure/package*.json ./packages/infrastructure/

# Install dependencies at root level
RUN npm ci

# Copy source code
COPY packages/backend/src ./packages/backend/src
COPY packages/backend/tsconfig.json ./packages/backend/
COPY packages/frontend/src ./packages/frontend/src
COPY packages/frontend/tsconfig.json ./packages/frontend/
COPY packages/infrastructure/src ./packages/infrastructure/src
COPY packages/infrastructure/tsconfig.json ./packages/infrastructure/
COPY tsconfig.json ./

# Build only the backend
RUN npm run build:backend

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/packages/backend/package*.json ./
COPY --from=builder /app/packages/backend/dist ./dist

RUN npm install --omit=dev

EXPOSE 3000

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN chown -R nodejs:nodejs /app

USER nodejs

CMD ["node", "dist/server.js"]
