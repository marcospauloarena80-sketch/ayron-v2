# AYRON — Production Guide

## Requisitos mínimos (VPS)

- Ubuntu 22.04+ ou Debian 12
- Docker 24+ e Docker Compose v2
- 2 vCPU / 4GB RAM mínimo (recomendado 4 vCPU / 8GB)
- Portas abertas: 80, 443

---

## 1. Configuração de variáveis

Crie `apps/api/.env.production` com:

```env
DATABASE_URL=postgresql://ayron:<SENHA>@postgres:5432/ayron_prod
JWT_SECRET=<openssl rand -hex 64>
JWT_EXPIRES_IN=7d
APP_FIELD_ENCRYPTION_KEY=<openssl rand -hex 32>
REDIS_URL=redis://redis:6379
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=<gerado>
MINIO_SECRET_KEY=<gerado>
MINIO_BUCKET=ayron-docs
MINIO_REGION=us-east-1
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox
PDF_TIMEOUT_MS=20000
PORT=4000
NODE_ENV=production
CORS_ORIGINS=https://seudominio.com.br
```

Crie `apps/web/.env.production`:

```env
NEXT_PUBLIC_API_URL=https://seudominio.com.br/api/v1
```

### Gerar segredos

```bash
# JWT_SECRET
openssl rand -hex 64

# APP_FIELD_ENCRYPTION_KEY (AES-256: 32 bytes = 64 hex chars)
openssl rand -hex 32

# MINIO keys
openssl rand -hex 16
```

---

## 2. Subir a stack

```bash
docker compose -f docker-compose.production.yml up -d
```

### Primeira execução — migrações e seed

```bash
docker compose -f docker-compose.production.yml exec api \
  npx prisma migrate deploy

docker compose -f docker-compose.production.yml exec api \
  npx prisma db seed
```

---

## 3. Verificar saúde

```bash
curl https://seudominio.com.br/api/v1/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "db": "connected",
  "redis": "connected",
  "minio": "reachable",
  "rls": "active",
  "audit_trigger": "active"
}
```

---

## 4. TLS / HTTPS

### Opção A — Let's Encrypt (recomendado)

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx

# Gerar certificado
sudo certbot --nginx -d seudominio.com.br

# Renovação automática (cron já configurado pelo certbot)
sudo certbot renew --dry-run
```

### Opção B — Certificado do provedor

Coloque os arquivos em `infra/nginx/certs/`:
- `cert.pem`
- `key.pem`

Ajuste `infra/nginx/sites-enabled/ayron.conf` para apontar para esses caminhos.

---

## 5. Backup do banco

```bash
# Backup manual
docker compose -f docker-compose.production.yml exec postgres \
  pg_dump -U ayron ayron_prod | gzip > /var/lib/ayron/backups/$(date +%Y%m%d_%H%M%S).sql.gz

# Restore
zcat backup.sql.gz | docker compose -f docker-compose.production.yml exec -T postgres \
  psql -U ayron ayron_prod
```

O container `backup` (se presente no compose) roda dump diário automaticamente com retenção de 7 dias.

---

## 6. MinIO — criar bucket

Após subir a stack, acesse `http://seudominio.com.br:9001` (MinIO Console) ou use a CLI:

```bash
docker compose exec minio mc alias set local http://minio:9000 <access_key> <secret_key>
docker compose exec minio mc mb local/ayron-docs
docker compose exec minio mc policy set none local/ayron-docs
```

---

## 7. Logs

```bash
# API
docker compose -f docker-compose.production.yml logs -f api

# Todos os serviços
docker compose -f docker-compose.production.yml logs -f
```

---

## 8. Rollback

```bash
# Reverter para imagem anterior
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d --no-deps api

# Ou para versão específica
docker compose -f docker-compose.production.yml up -d api=<imagem:tag>
```

---

## 9. Segurança — checklist pré-produção

- [ ] JWT_SECRET forte (≥ 64 bytes hex)
- [ ] APP_FIELD_ENCRYPTION_KEY configurado (CPF/phone criptografados)
- [ ] POSTGRES_PASSWORD não é padrão
- [ ] MinIO não exposto publicamente (sem policy public)
- [ ] HTTPS ativo
- [ ] Backup diário configurado e testado
- [ ] RLS ativo: `GET /api/v1/health` → `"rls": "active"`
- [ ] Audit trigger ativo: `"audit_trigger": "active"`
- [ ] CORS restrito ao domínio da aplicação
