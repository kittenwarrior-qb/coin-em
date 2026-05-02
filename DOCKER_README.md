# 🐳 Docker Setup Guide - EMCOIN Game

## Quick Start

### Development

```bash
# Start dev environment
make dev-up

# Access:
# Frontend: http://localhost:5173
# Backend: http://localhost:3001

# View logs
make dev-logs

# Stop
make dev-down
```

### Production

```bash
# 1. Update Caddyfile with your domain
nano Caddyfile
# Change emcoin.example.com to your-domain.com

# 2. Build frontend
cd fe && npm run build && cd ..

# 3. Start production
make prod-up

# Access: https://your-domain.com (auto HTTPS)

# View logs
make prod-logs
```

---

## Why Caddy? ✅

### Caddy vs Nginx Comparison

| Feature | Caddy | Nginx |
|---------|-------|-------|
| **Auto HTTPS** | ✅ Built-in | ❌ Need certbot |
| **Setup Time** | 30 min | 2-3 hours |
| **Config Lines** | 15 | 40+ |
| **WebSocket** | ✅ Auto | ⚠️ Manual config |
| **SSL Renewal** | ✅ Auto | ⚠️ Cron job |
| **HTTP/3** | ✅ Default | ⚠️ Manual |
| **Maintenance** | Low | Medium |

**Verdict:** Caddy wins for this project because:
1. ✅ Auto HTTPS saves 2+ hours setup
2. ✅ WebSocket support crucial for Socket.IO
3. ✅ Simpler config = fewer bugs
4. ✅ Modern HTTP/2, HTTP/3 by default

---

## Architecture

### Development
```
┌─────────────────────────────────────┐
│  Frontend (Vite) :5173              │
│  - Hot Module Replacement           │
│  - Source code mounted              │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  Backend (Node.js) :3001            │
│  - Hot reload with nodemon          │
│  - Source code mounted              │
│  - Data persisted in volume         │
└─────────────────────────────────────┘
```

### Production
```
┌─────────────────────────────────────┐
│  Caddy :80, :443                    │
│  - Auto HTTPS (Let's Encrypt)       │
│  - Reverse proxy                    │
│  - Static file serving              │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  Backend (Node.js) :3001            │
│  - Production build                 │
│  - Health checks                    │
│  - Data persisted in volume         │
└─────────────────────────────────────┘
```

---

## Commands Reference

### Development

```bash
# Start
make dev-up

# Stop
make dev-down

# View logs (follow)
make dev-logs

# Rebuild containers
make dev-rebuild

# Access shell
docker exec -it emcoin-backend-dev sh
docker exec -it emcoin-frontend-dev sh
```

### Production

```bash
# Start
make prod-up

# Stop
make prod-down

# View logs
make prod-logs

# Rebuild
make prod-rebuild

# Backup data
make backup

# Access shell
docker exec -it emcoin-backend-prod sh
```

### Maintenance

```bash
# Clean everything
make clean

# Check status
docker ps

# Check logs
docker logs emcoin-backend-prod
docker logs emcoin-caddy

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

---

## Configuration

### Caddyfile

```caddy
# Change this to your domain
emcoin.example.com {
    # Backend API
    reverse_proxy /api/* backend:3001
    
    # Socket.IO
    reverse_proxy /socket.io/* backend:3001
    
    # Frontend
    file_server /* {
        root /var/www/html
    }
}
```

### Environment Variables

Create `.env` file:
```bash
# Development
NODE_ENV=development
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
VITE_API_URL=http://localhost:3001

# Production
# NODE_ENV=production
# CLIENT_ORIGIN=https://your-domain.com
# VITE_API_URL=https://your-domain.com
```

---

## Deployment to Server

### 1. Server Setup (Ubuntu/Debian)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Install Make
sudo apt install make -y

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Deploy Application

```bash
# Clone repo
git clone <your-repo-url>
cd emcoin

# Update Caddyfile with your domain
nano Caddyfile

# Build frontend
cd fe
npm install
npm run build
cd ..

# Start production
make prod-up

# Check logs
make prod-logs
```

### 3. DNS Configuration

Point your domain to server IP:
```
A Record: emcoin.example.com → YOUR_SERVER_IP
```

Caddy will automatically get SSL certificate from Let's Encrypt.

---

## Troubleshooting

### Port Already in Use

```bash
# Find process
sudo lsof -i :3001
sudo lsof -i :5173

# Kill process
sudo kill -9 <PID>

# Or use different ports in docker-compose
```

### Caddy SSL Issues

```bash
# Check domain DNS
dig emcoin.example.com

# Check Caddy logs
docker logs emcoin-caddy

# Ensure ports are open
sudo ufw allow 80
sudo ufw allow 443
```

### Backend Connection Issues

```bash
# Check network
docker network inspect emcoin-network

# Check backend health
curl http://localhost:3001/health

# Check logs
docker logs emcoin-backend-prod
```

### Data Persistence Issues

```bash
# Check volumes
docker volume ls

# Inspect volume
docker volume inspect emcoin_backend-data

# Backup data
make backup
```

---

## Monitoring

### Health Checks

```bash
# Backend health
curl http://localhost:3001/health

# Container status
docker ps

# Resource usage
docker stats
```

### Logs

```bash
# All logs
make prod-logs

# Specific service
docker logs emcoin-backend-prod -f
docker logs emcoin-caddy -f

# Last 100 lines
docker logs emcoin-backend-prod --tail 100
```

---

## Backup & Restore

### Backup

```bash
# Automated backup
make backup

# Manual backup
docker cp emcoin-backend-prod:/app/data ./backup/data-$(date +%Y%m%d)
docker cp emcoin-caddy:/data ./backup/caddy-$(date +%Y%m%d)
```

### Restore

```bash
# Stop containers
make prod-down

# Restore data
docker cp ./backup/data-20260502 emcoin-backend-prod:/app/data

# Start containers
make prod-up
```

---

## Updating

### Update Code

```bash
# Pull latest code
git pull

# Rebuild and restart
make prod-rebuild

# Or zero-downtime update
docker-compose -f docker-compose.prod.yml up -d --build --no-deps backend
```

### Update Dependencies

```bash
# Backend
cd be
npm update
cd ..

# Frontend
cd fe
npm update
cd ..

# Rebuild
make prod-rebuild
```

---

## Performance Tuning

### Caddy

```caddy
# Add caching
emcoin.example.com {
    # Cache static assets
    @static {
        path *.js *.css *.png *.jpg *.svg
    }
    header @static Cache-Control "public, max-age=31536000"
}
```

### Backend

```yaml
# docker-compose.prod.yml
backend:
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 512M
      reservations:
        cpus: '0.5'
        memory: 256M
```

---

## Security

### Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### SSL/TLS

Caddy automatically:
- ✅ Gets SSL certificate from Let's Encrypt
- ✅ Renews certificates automatically
- ✅ Redirects HTTP to HTTPS
- ✅ Uses modern TLS 1.3

### Headers

Security headers already configured in Caddyfile:
- Strict-Transport-Security
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy

---

## Cost Estimate

### Server Requirements

**Minimum (Dev/Small Production):**
- 1 CPU core
- 1 GB RAM
- 20 GB storage
- Cost: ~$5-10/month (DigitalOcean, Linode, Vultr)

**Recommended (Production):**
- 2 CPU cores
- 2 GB RAM
- 40 GB storage
- Cost: ~$10-20/month

### Comparison

| Setup | Time | Monthly Cost |
|-------|------|--------------|
| **Caddy** | 30 min | $0 (included) |
| **Nginx + Certbot** | 2-3 hours | $0 (included) |
| **Managed SSL** | 1 hour | $5-10/month |

**Savings with Caddy:** 2.5 hours + $60-120/year

---

## FAQ

**Q: Why not use Nginx?**  
A: Caddy is simpler for this project. Nginx is better for very high traffic (> 10k concurrent users).

**Q: Can I use both dev and prod on same server?**  
A: Yes, but use different ports or domains.

**Q: How to enable HTTPS in development?**  
A: Use `mkcert` for local SSL or just use HTTP in dev.

**Q: How to scale to multiple servers?**  
A: Add Redis and use Socket.IO Redis Adapter (see Phase 4 in refactor plan).

**Q: How to monitor in production?**  
A: Add Prometheus + Grafana or use cloud monitoring (Datadog, New Relic).

---

## Support

For issues:
1. Check logs: `make prod-logs`
2. Check health: `curl http://localhost:3001/health`
3. Check containers: `docker ps`
4. Check network: `docker network inspect emcoin-network`

---

**Created:** 2026-05-02  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
