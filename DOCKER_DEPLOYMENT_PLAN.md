# 🐳 DOCKER DEPLOYMENT PLAN - EMCOIN GAME

## I. TỔNG QUAN KIẾN TRÚC

### Development vs Production

```
┌─────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT                               │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Vite Dev Server) :5173                           │
│  Backend (Node.js) :3001                                    │
│  Hot Reload: ✅                                             │
│  Volumes: Source code mounted                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION                                │
├─────────────────────────────────────────────────────────────┤
│  Caddy/Nginx :80, :443                                      │
│    ├─ Frontend (Static files)                               │
│    └─ Backend (Reverse proxy) → Node.js :3001              │
│  SSL: Auto (Caddy) / Manual (Nginx)                        │
│  Volumes: Data persistence only                             │
└─────────────────────────────────────────────────────────────┘
```

---

## II. CADDY vs NGINX - SO SÁNH CHI TIẾT

### 1. Caddy - KHUYẾN NGHỊ cho dự án này ✅

#### Ưu điểm:
- ✅ **Auto HTTPS**: Tự động lấy SSL cert từ Let's Encrypt
- ✅ **Zero config SSL**: Không cần setup certbot
- ✅ **Cấu hình đơn giản**: Caddyfile dễ đọc, dễ hiểu
- ✅ **WebSocket support**: Built-in, không cần config thêm
- ✅ **Auto reload**: Tự động reload config khi thay đổi
- ✅ **Modern**: HTTP/2, HTTP/3 (QUIC) mặc định
- ✅ **Reverse proxy**: Đơn giản, ít dòng config

#### Nhược điểm:
- ⚠️ **Ít phổ biến hơn**: Community nhỏ hơn Nginx
- ⚠️ **Performance**: Chậm hơn Nginx một chút (không đáng kể)
- ⚠️ **Tài liệu**: Ít hơn Nginx

#### Caddyfile example:
```caddy
# Cực kỳ đơn giản!
emcoin.example.com {
    # Auto HTTPS
    reverse_proxy /api/* backend:3001
    reverse_proxy /socket.io/* backend:3001
    file_server /* {
        root /var/www/html
    }
}
```

**Tổng:** 15 dòng config cho full production setup

---

### 2. Nginx - Alternative

#### Ưu điểm:
- ✅ **Performance**: Nhanh nhất, battle-tested
- ✅ **Phổ biến**: Community lớn, nhiều tài liệu
- ✅ **Flexible**: Cấu hình chi tiết, nhiều options
- ✅ **Caching**: Built-in caching mạnh mẽ

#### Nhược điểm:
- ❌ **SSL phức tạp**: Cần certbot, cron job renewal
- ❌ **Config dài**: Nhiều boilerplate
- ❌ **WebSocket**: Cần config thêm headers
- ❌ **Reload**: Phải reload manual

#### Nginx config example:
```nginx
# Phức tạp hơn nhiều
server {
    listen 80;
    server_name emcoin.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name emcoin.example.com;
    
    ssl_certificate /etc/letsencrypt/live/emcoin.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/emcoin.example.com/privkey.pem;
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://backend:3001;
    }
    
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }
}
```

**Tổng:** 40+ dòng config + certbot setup

---

### 3. Kết luận: Chọn Caddy ✅

**Lý do:**
1. ✅ **Auto HTTPS**: Quan trọng nhất, tiết kiệm thời gian
2. ✅ **WebSocket**: Dự án này dùng Socket.IO → cần WebSocket
3. ✅ **Đơn giản**: Team nhỏ, không cần complexity của Nginx
4. ✅ **Modern**: HTTP/2, HTTP/3 mặc định
5. ✅ **Maintenance**: Ít config → ít lỗi

**Khi nào dùng Nginx:**
- Cần performance tối đa (> 10k concurrent users)
- Đã có kinh nghiệm với Nginx
- Cần caching phức tạp
- Cần load balancing nhiều backend instances

---

## III. DOCKER COMPOSE - DEVELOPMENT

### File: `docker-compose.dev.yml`

```yaml
version: '3.8'

services:
  # Backend - Node.js with hot reload
  backend:
    build:
      context: ./be
      dockerfile: Dockerfile.dev
    container_name: emcoin-backend-dev
    ports:
      - "3001:3001"
    volumes:
      - ./be:/app
      - /app/node_modules  # Prevent overwriting node_modules
      - ./be/data:/app/data  # Persist room data
    environment:
      - NODE_ENV=development
      - PORT=3001
      - CLIENT_ORIGIN=http://localhost:5173
    command: npm run dev
    networks:
      - emcoin-network
    restart: unless-stopped

  # Frontend - Vite dev server with HMR
  frontend:
    build:
      context: ./fe
      dockerfile: Dockerfile.dev
    container_name: emcoin-frontend-dev
    ports:
      - "5173:5173"
    volumes:
      - ./fe:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - VITE_API_URL=http://localhost:3001
    command: npm run dev -- --host 0.0.0.0
    networks:
      - emcoin-network
    depends_on:
      - backend
    restart: unless-stopped

networks:
  emcoin-network:
    driver: bridge

volumes:
  backend-data:
```

### Backend Dockerfile.dev

```dockerfile
# be/Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code (will be overridden by volume)
COPY . .

# Expose port
EXPOSE 3001

# Start dev server with hot reload
CMD ["npm", "run", "dev"]
```

### Frontend Dockerfile.dev

```dockerfile
# fe/Dockerfile.dev
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code (will be overridden by volume)
COPY . .

# Expose Vite port
EXPOSE 5173

# Start Vite dev server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### Usage:

```bash
# Start dev environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop
docker-compose -f docker-compose.dev.yml down

# Rebuild
docker-compose -f docker-compose.dev.yml up -d --build
```

---

## IV. DOCKER COMPOSE - PRODUCTION

### File: `docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  # Backend - Node.js production
  backend:
    build:
      context: ./be
      dockerfile: Dockerfile.prod
    container_name: emcoin-backend-prod
    expose:
      - "3001"
    volumes:
      - backend-data:/app/data  # Persist room data
    environment:
      - NODE_ENV=production
      - PORT=3001
      - CLIENT_ORIGIN=https://emcoin.example.com
    networks:
      - emcoin-network
    restart: always
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Frontend - Static files served by Caddy
  frontend:
    build:
      context: ./fe
      dockerfile: Dockerfile.prod
    container_name: emcoin-frontend-prod
    expose:
      - "80"
    networks:
      - emcoin-network
    restart: always

  # Caddy - Reverse proxy with auto HTTPS
  caddy:
    image: caddy:2-alpine
    container_name: emcoin-caddy
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"  # HTTP/3
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
      - caddy-config:/config
      - frontend-dist:/var/www/html:ro
    networks:
      - emcoin-network
    depends_on:
      - backend
      - frontend
    restart: always

networks:
  emcoin-network:
    driver: bridge

volumes:
  backend-data:
  caddy-data:
  caddy-config:
  frontend-dist:
```

### Backend Dockerfile.prod

```dockerfile
# be/Dockerfile.prod
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

# Start production server
CMD ["node", "dist/index.js"]
```

### Frontend Dockerfile.prod

```dockerfile
# fe/Dockerfile.prod
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build for production
RUN npm run build

# Production image - just static files
FROM alpine:latest

WORKDIR /var/www/html

# Copy built files
COPY --from=builder /app/dist .

# No server needed, Caddy will serve
```

### Caddyfile

```caddy
# Caddyfile
{
    # Global options
    email admin@emcoin.example.com
    admin off
}

# Production domain
emcoin.example.com {
    # Enable compression
    encode gzip zstd

    # Backend API
    handle /api/* {
        reverse_proxy backend:3001
    }

    # Socket.IO WebSocket
    handle /socket.io/* {
        reverse_proxy backend:3001
    }

    # Frontend static files
    handle /* {
        root * /var/www/html
        try_files {path} /index.html
        file_server
    }

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Logging
    log {
        output file /var/log/caddy/access.log
        format json
    }
}

# Staging/Dev domain (optional)
dev.emcoin.example.com {
    reverse_proxy backend:3001
}
```

### Usage:

```bash
# Build and start production
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop
docker-compose -f docker-compose.prod.yml down

# Update (zero-downtime)
docker-compose -f docker-compose.prod.yml up -d --build --no-deps backend
```

---

## V. MAKEFILE - SIMPLIFIED COMMANDS

### File: `Makefile`

```makefile
.PHONY: help dev-up dev-down dev-logs prod-up prod-down prod-logs

help:
	@echo "EMCOIN Game - Docker Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev-up      - Start dev environment"
	@echo "  make dev-down    - Stop dev environment"
	@echo "  make dev-logs    - View dev logs"
	@echo "  make dev-rebuild - Rebuild dev containers"
	@echo ""
	@echo "Production:"
	@echo "  make prod-up     - Start production"
	@echo "  make prod-down   - Stop production"
	@echo "  make prod-logs   - View production logs"
	@echo "  make prod-rebuild - Rebuild production"

# Development
dev-up:
	docker-compose -f docker-compose.dev.yml up -d

dev-down:
	docker-compose -f docker-compose.dev.yml down

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

dev-rebuild:
	docker-compose -f docker-compose.dev.yml up -d --build

# Production
prod-up:
	docker-compose -f docker-compose.prod.yml up -d

prod-down:
	docker-compose -f docker-compose.prod.yml down

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f

prod-rebuild:
	docker-compose -f docker-compose.prod.yml up -d --build

# Cleanup
clean:
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose -f docker-compose.prod.yml down -v
	docker system prune -f
```

---

## VI. .DOCKERIGNORE FILES

### be/.dockerignore

```
node_modules
npm-debug.log
dist
.env
.git
.gitignore
README.md
data/*.json
*.log
```

### fe/.dockerignore

```
node_modules
npm-debug.log
dist
.env
.git
.gitignore
README.md
*.log
```

---

## VII. ENVIRONMENT VARIABLES

### .env.dev

```bash
# Backend
NODE_ENV=development
PORT=3001
CLIENT_ORIGIN=http://localhost:5173

# Frontend
VITE_API_URL=http://localhost:3001
```

### .env.prod

```bash
# Backend
NODE_ENV=production
PORT=3001
CLIENT_ORIGIN=https://emcoin.example.com

# Frontend
VITE_API_URL=https://emcoin.example.com
```

---

## VIII. DEPLOYMENT WORKFLOW

### Development

```bash
# 1. Clone repo
git clone <repo-url>
cd emcoin

# 2. Start dev environment
make dev-up

# 3. Access
# Frontend: http://localhost:5173
# Backend: http://localhost:3001

# 4. View logs
make dev-logs

# 5. Stop
make dev-down
```

### Production

```bash
# 1. Setup server (Ubuntu/Debian)
sudo apt update
sudo apt install docker.io docker-compose make

# 2. Clone repo
git clone <repo-url>
cd emcoin

# 3. Configure domain in Caddyfile
nano Caddyfile
# Change emcoin.example.com to your domain

# 4. Start production
make prod-up

# 5. Caddy auto-gets SSL cert from Let's Encrypt
# Access: https://your-domain.com

# 6. Monitor
make prod-logs
```

---

## IX. MONITORING & MAINTENANCE

### Health Checks

```bash
# Backend health
curl http://localhost:3001/health

# Check containers
docker ps

# Check logs
docker logs emcoin-backend-prod
docker logs emcoin-caddy
```

### Backup Data

```bash
# Backup room data
docker cp emcoin-backend-prod:/app/data ./backup/data-$(date +%Y%m%d)

# Backup Caddy certs
docker cp emcoin-caddy:/data ./backup/caddy-$(date +%Y%m%d)
```

### Update Deployment

```bash
# Pull latest code
git pull

# Rebuild and restart (zero-downtime)
docker-compose -f docker-compose.prod.yml up -d --build --no-deps backend

# Or full restart
make prod-rebuild
```

---

## X. COST COMPARISON

### Caddy Setup
- **Time to setup**: 30 minutes
- **SSL**: Free (Let's Encrypt)
- **Maintenance**: Minimal (auto-renewal)
- **Config lines**: ~15 lines

### Nginx Setup
- **Time to setup**: 2-3 hours
- **SSL**: Free (Let's Encrypt + certbot)
- **Maintenance**: Medium (cron jobs, manual renewal)
- **Config lines**: ~40+ lines

**Savings with Caddy:** 2.5 hours setup + ongoing maintenance time

---

## XI. TROUBLESHOOTING

### Common Issues

**1. Port already in use**
```bash
# Find process using port
sudo lsof -i :3001
sudo lsof -i :5173

# Kill process
sudo kill -9 <PID>
```

**2. Caddy SSL fails**
```bash
# Check domain DNS
dig emcoin.example.com

# Check Caddy logs
docker logs emcoin-caddy

# Ensure ports 80, 443 are open
sudo ufw allow 80
sudo ufw allow 443
```

**3. Backend can't connect**
```bash
# Check network
docker network inspect emcoin-network

# Check backend logs
docker logs emcoin-backend-prod
```

---

## XII. SUMMARY

### ✅ Recommended Stack

```
Production:
  ├─ Caddy (Reverse Proxy + Auto HTTPS)
  ├─ Backend (Node.js + Socket.IO)
  ├─ Frontend (Static files)
  └─ Docker Compose

Development:
  ├─ Backend (Hot reload)
  ├─ Frontend (Vite HMR)
  └─ Docker Compose
```

### 📊 Comparison

| Feature | Caddy | Nginx |
|---------|-------|-------|
| **Setup Time** | 30 min | 2-3 hours |
| **SSL** | Auto | Manual |
| **Config** | 15 lines | 40+ lines |
| **WebSocket** | Built-in | Need config |
| **Maintenance** | Low | Medium |
| **Performance** | 95% | 100% |
| **Recommendation** | ✅ YES | ⚠️ If needed |

### 🎯 Next Steps

1. ✅ Create Dockerfiles
2. ✅ Create docker-compose files
3. ✅ Create Caddyfile
4. ✅ Test dev environment
5. ✅ Test prod environment
6. ✅ Deploy to server

**Estimated time:** 1-2 days for full setup and testing
