# RedditPal Deployment Guide

## Cloudflare Deployment

Since you have your domain registered on Cloudflare, here are the recommended deployment options:

### Option 1: Traditional VPS (Recommended for Full Control)

**Providers:**
- DigitalOcean ($5-20/month)
- Linode
- Vultr
- AWS Lightsail

**Steps:**

1. **Create a droplet (Ubuntu 22.04)**
   ```bash
   ssh root@your_vps_ip
   ```

2. **Install Node.js and PM2**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```

3. **Clone repository**
   ```bash
   git clone https://github.com/Kapodistrias7/redditpal.git
   cd redditpal
   npm install --production
   ```

4. **Setup environment**
   ```bash
   cp .env.example .env
   nano .env  # Update with your settings
   ```

5. **Start with PM2**
   ```bash
   pm2 start server.js --name "redditpal"
   pm2 startup
   pm2 save
   ```

6. **Setup Nginx Reverse Proxy**
   ```bash
   sudo apt-get install nginx
   ```

   Create `/etc/nginx/sites-available/redditpal`:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/redditpal /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

7. **Setup SSL with Let's Encrypt**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

8. **Cloudflare DNS Setup**
   - Log in to Cloudflare
   - Go to DNS Records
   - Create A record pointing to your VPS IP:
     ```
     Name: @
     Type: A
     Content: YOUR_VPS_IP
     TTL: Auto
     Proxy: DNS only (not Proxied)
     ```
   - For www subdomain:
     ```
     Name: www
     Type: CNAME
     Content: yourdomain.com
     TTL: Auto
     Proxy: DNS only
     ```

### Option 2: Docker Container (Recommended for Scalability)

**Using Docker:**

1. **Build image**
   ```bash
   docker build -t redditpal .
   ```

2. **Run container**
   ```bash
   docker run -d \
     --name redditpal \
     -p 3000:3000 \
     -e NODE_ENV=production \
     -e CORS_ORIGIN=https://yourdomain.com \
     --restart unless-stopped \
     redditpal
   ```

3. **Update Cloudflare DNS** (same as Option 1, step 8)

### Option 3: Cloudflare Workers + External Backend

**Note:** Cloudflare Workers have limitations with long-running processes. Use a separate backend.

1. Deploy backend to VPS (Options 1 or 2)
2. Update `script.js` API_URL to your domain
3. No need for additional Cloudflare configuration

## Environment Variables Setup

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://yourdomain.com
CACHE_TTL=300000
USER_AGENT=RedditPal/1.0 (Programming Feed Aggregator)
LOG_LEVEL=info
```

## Cloudflare Page Rules (Optional)

1. Go to Cloudflare dashboard
2. Speed → Page Rules
3. Add rule:
   - URL: `yourdomain.com/api/*`
   - Cache Everything
   - Browser Cache TTL: 1 day
   - Browser Integrity Check: Off

## Cloudflare Security Settings

1. **SSL/TLS:** Set to "Full" or "Full (strict)"
2. **Firewall Rules:** Optionally block specific regions
3. **DDoS Protection:** Enabled (automatic)
4. **Rate Limiting:** Optional, 100 requests per 10 seconds per IP

## Monitoring & Logs

**SSH into your VPS:**
```bash
# View PM2 logs
pm2 logs redditpal

# View real-time
pm2 logs redditpal --lines 100 --follow

# Docker logs
docker logs -f redditpal
```

## SSL Certificate

**Auto-renewal with Let's Encrypt:**
```bash
sudo certbot renew --dry-run  # Test renewal
sudo certbot renew  # Actual renewal
```

## Performance Optimization

1. **Cloudflare Caching:** Enable automatic
2. **Minify:** Enable CSS, JavaScript, HTML
3. **HTTP/2:** Enabled by default
4. **Brotli Compression:** Enable in Cloudflare
5. **Browser Cache TTL:** 30 minutes or more

## Troubleshooting

**502 Bad Gateway:**
```bash
# Check if Node.js is running
pm2 status
pm2 restart redditpal

# Check port binding
netstat -tuln | grep 3000
```

**High CPU/Memory:**
```bash
# Monitor processes
htop

# Restart service
pm2 restart redditpal
```

**SSL Certificate Issues:**
```bash
# Check certificate
ssl-cert-check -f /etc/letsencrypt/live/yourdomain.com/cert.pem

# Renew certificate
sudo certbot renew
```

## Automated Backups

Setup weekly backups:
```bash
# Create backup script
sudo nano /usr/local/bin/backup-redditpal.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/backups"
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf $BACKUP_DIR/redditpal-$DATE.tar.gz /home/redditpal
find $BACKUP_DIR -name "redditpal-*.tar.gz" -mtime +7 -delete
```

Add to crontab:
```bash
sudo crontab -e
# Add: 0 2 * * 0 /usr/local/bin/backup-redditpal.sh
```

## Uptime Monitoring

Setup with UptimeRobot (free):

1. Go to uptimerobot.com
2. Add monitor:
   - URL: `https://yourdomain.com/api/health`
   - Check interval: 5 minutes
   - Notifications: Email

## Final Checklist

- [ ] VPS/Container deployed
- [ ] Cloudflare DNS configured
- [ ] SSL certificate installed
- [ ] Environment variables set
- [ ] Node.js running (pm2/docker)
- [ ] Reverse proxy configured (Nginx)
- [ ] Monitoring setup
- [ ] Backups configured
- [ ] Domain pointing to server
- [ ] Testing /api/health endpoint

---

For more help, check the README.md
