#!/bin/bash
# ============================================================
# AYRON — TLS setup with Let's Encrypt (certbot)
# Run ONCE on the VPS before starting the full stack.
# Requires: docker, domain pointed at this VPS.
# ============================================================
set -euo pipefail

DOMAIN="${1:?Usage: $0 yourdomain.com your@email.com}"
EMAIL="${2:?Usage: $0 yourdomain.com your@email.com}"

echo "==> Setting up TLS for $DOMAIN (email: $EMAIL)"

# Ensure dirs exist
mkdir -p /var/www/certbot /etc/letsencrypt /var/lib/ayron/backups

# Start nginx in HTTP-only mode first (for ACME challenge)
echo "==> Starting nginx (HTTP only) for ACME challenge..."
docker compose -f docker-compose.production.yml --env-file .env.production \
  up -d nginx --no-deps 2>&1 || true

sleep 3

# Issue certificate
echo "==> Requesting certificate from Let's Encrypt..."
docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" -d "www.$DOMAIN"

echo "==> Certificate issued!"
echo "==> Updating nginx config: replacing YOUR_DOMAIN with $DOMAIN"
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" infra/nginx/sites-enabled/ayron.conf

echo "==> Reloading nginx..."
docker compose -f docker-compose.production.yml --env-file .env.production \
  exec nginx nginx -s reload 2>/dev/null || \
  docker compose -f docker-compose.production.yml --env-file .env.production \
  restart nginx

echo ""
echo "==> TLS setup complete!"
echo "    Test: curl -I https://$DOMAIN/api/v1/health"
