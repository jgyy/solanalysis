FROM node:18-alpine AS builder

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/packages/backend/package*.json ./
COPY --from=builder /app/packages/backend/dist ./dist

COPY --from=builder /app/packages/shared /app/packages/shared

RUN npm install --omit=dev

EXPOSE 3000

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

RUN chown -R nodejs:nodejs /app

USER nodejs

CMD ["node", "dist/server.js"]
