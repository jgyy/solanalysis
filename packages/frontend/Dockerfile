FROM node:18-alpine AS builder

WORKDIR /app

# Copy the entire monorepo
COPY . .

# Install and build everything
RUN npm install
RUN npm run build

FROM nginx:alpine

# Copy built frontend assets
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html/dist

# Copy static assets from frontend public folder
COPY --from=builder /app/packages/frontend/public/* /usr/share/nginx/html/

# Nginx configuration
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /dist/ { \
        add_header Cache-Control "public, max-age=31536000"; \
    } \
    \
    location /api/ { \
        proxy_pass http://backend:3000/; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
    \
    location /solana-rpc { \
        proxy_pass http://backend:3000/solana-rpc; \
        proxy_http_version 1.1; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
    \
    location /price/ { \
        proxy_pass http://backend:3000/price/; \
        proxy_http_version 1.1; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]