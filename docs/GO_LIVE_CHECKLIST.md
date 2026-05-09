# AYRON — Go-Live Checklist

Last updated: FASE 3.

## 1. Environment variables

### Backend (Railway → Variables)
| Var | Required | Notes |
|-----|----------|-------|
| `DATABASE_URL` | yes | Postgres connection (Railway Postgres) |
| `JWT_SECRET` | yes | Long random string, ≥32 chars |
| `JWT_EXPIRES_IN` | no | Default `8h` |
| `NODE_ENV` | yes | `production` |
| `BOOTSTRAP_SECRET` | yes (prod) | Required to call `POST /auth/bootstrap` in prod |
| `BOOTSTRAP_ENABLED` | recommended | Set to `false` after first MASTER created |
| `REDIS_URL` | optional | Enables session/queue features |
| `S3_*` / MinIO vars | optional | For document/audio storage |
| `RAILWAY_GIT_COMMIT_SHA` | auto | Railway sets it; surfaces in `/health` |
| `SENTRY_DSN` | optional | Backend error tracking (env-gated) |
| `BCRYPT_ROUNDS` | no | Default 12 |

### Frontend (Vercel → Environment Variables, Production)
| Var | Required | Notes |
|-----|----------|-------|
| `NEXT_PUBLIC_API_URL` | yes | `https://api-production-554f.up.railway.app/api/v1` |
| `NEXT_PUBLIC_SENTRY_DSN` | optional | Frontend error tracking |
| `NEXT_PUBLIC_SUPABASE_URL` | legacy | Only for fallback Supabase queries (being removed) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | legacy | Same |

## 2. Production URLs

| Service | URL |
|---------|-----|
| Backend (Railway) | `https://api-production-554f.up.railway.app/api/v1` |
| Health | `https://api-production-554f.up.railway.app/api/v1/health` |
| Ready | `https://api-production-554f.up.railway.app/api/v1/ready` |
| Frontend (Vercel alias) | `https://web-self-ten-76.vercel.app` |
| Frontend (org alias) | `https://web-capitalvortexx-6920s-projects.vercel.app` |

## 3. Smoke tests

### Healthcheck
```bash
curl -s https://api-production-554f.up.railway.app/api/v1/health | jq
# expect: status=ok, db=connected, uptime_seconds > 0
```

### Readiness
```bash
curl -i https://api-production-554f.up.railway.app/api/v1/ready
# expect: 200 OK
```

### Login (manual)
```bash
curl -s -X POST https://api-production-554f.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"master@ayron.health","password":"Ayron@Master2025!"}' | jq .access_token
```

### Full smoke suite
```bash
SMOKE_EMAIL=master@ayron.health SMOKE_PASSWORD='Ayron@Master2025!' \
  npm run smoke:prod
# expect: PASS=N FAIL=0
```

## 4. Manual go-live walkthrough

For each step, refresh the browser after to confirm persistence.

| # | Action | Where | Expected |
|---|--------|-------|----------|
| 1 | Login | `/login` | Redirected to `/dashboard`, name/role visible |
| 2 | Create patient | Pacientes → Novo | Patient appears in list, persists after refresh |
| 3 | Search patient | Pacientes → busca | Found by name/CPF/phone |
| 4 | Create appointment | Agenda → Novo | Slot appears, persists |
| 5 | Recurring appointment | Agenda → Novo + weekdays | Toast shows N created |
| 6 | Open chart | Clinical → click patient | Briefing/anamnese loads |
| 7 | Save evolution | Clinical → Nova evolução | Toast success, evolution shown |
| 8 | New protocol | Sessions → Novo Protocolo | Modal opens, protocol persists |
| 9 | New revenue | Financial → Nova Receita | Entry appears in list |
| 10 | Logout | Topbar → menu | Returns to `/login`, token cleared |

## 5. Backup & restore

### Postgres (Railway managed)
- **Automatic backups**: Railway Postgres has automated daily backups (Paid plan). Configure retention in Railway → Postgres → Settings.
- **Manual snapshot before risky migration**:
  ```bash
  # From Railway shell or local with DATABASE_URL set
  pg_dump "$DATABASE_URL" --format=custom --file=ayron-$(date +%F).dump
  ```
- **Restore**:
  ```bash
  pg_restore --clean --if-exists --dbname="$DATABASE_URL" ayron-YYYY-MM-DD.dump
  ```

### Storage (MinIO/S3)
- Bucket: configured via `S3_BUCKET` env (or MinIO instance on Railway).
- Sync to local for backup:
  ```bash
  aws s3 sync s3://ayron-docs ./backup/docs --endpoint-url=$S3_ENDPOINT
  ```

## 6. Rollback

### Backend
```bash
# Railway dashboard → Deployments → previous deploy → Redeploy
# OR via CLI:
railway up --service api --detach=false  # from a known-good commit
```

### Frontend
```bash
# Vercel dashboard → Deployments → previous deploy → "Promote to Production"
# OR via CLI:
vercel rollback https://web-PREVIOUS-DEPLOY.vercel.app
```

### Migration rollback
Migrations are forward-only via `prisma migrate deploy`. To rollback:
1. Restore DB from snapshot (above).
2. Revert the migration commit and force-deploy older container.
3. Never run `prisma migrate reset` in production.

## 7. Bootstrap protocol

**First MASTER user setup:**
1. Set `BOOTSTRAP_SECRET=<random>` in Railway.
2. After Railway redeploys, call:
   ```bash
   curl -X POST .../auth/bootstrap \
     -H "Content-Type: application/json" \
     -d '{"secret":"<random>","email":"...","password":"..."}'
   ```
3. **Immediately** set `BOOTSTRAP_ENABLED=false` in Railway and redeploy.
4. The endpoint is also locked once any MASTER user exists — this is defense in depth.

## 8. Observability

- `/health` returns version + uptime + DB/redis/storage status.
- `/ready` returns 200 only if DB reachable (use as Railway healthcheck).
- Frontend `ErrorBoundary` catches React errors at root. If `window.Sentry` exists, errors flow through.
- Backend audit logs (immutable trigger): `audit_logs` table — query via Prisma Studio.
- **TODO post-go-live**: install `@sentry/node` + `@sentry/nextjs`, set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`.

## 9. Known limitations / not in scope for go-live

- Stone payment gateway → "integração não configurada" placeholder.
- TISS guides → "integração não configurada" placeholder.
- Biometria facial → "será ativada na próxima versão".
- Audio transcription (Consulta IA) → requires OpenAI API key in `OPENAI_API_KEY`.
- pgvector / cognitive embeddings → deferred (column commented in schema).
- `last_appointment_at` cache → column exists but no trigger updating it on appointment finalize yet.

## 10. Contacts / responsibility

| Area | Owner | Channel |
|------|-------|---------|
| Backend / DevOps | Marcos | (definir) |
| Frontend | Marcos | (definir) |
| Clínica piloto / UAT | Murilo | (definir) |
| Banco de dados | Marcos | (definir) |
| Incidentes prod | Marcos | (definir) |

## 10.1 Account map

| Service | Account | Notes |
|---------|---------|-------|
| Railway | `capitalvortexx@gmail.com` | Project: `ayron-v2` (Vortex Capital workspace) |
| Vercel | `capitalvortexx@gmail.com` | Project: `web` (capitalvortexx-6920s-projects) |
| GitHub | `marcospauloarena80@gmail.com` | Repo: `marcospauloarena80-sketch/ayron-v2` |

> Railway CLI: `railway login` → autorizar com `capitalvortexx@gmail.com`
> Vercel CLI: já autenticado como `capitalvortexx-6920`
> GitHub remote: `https://github.com/marcospauloarena80-sketch/ayron-v2.git`
>
> ⚠️  Railway NÃO auto-deploya do GitHub (contas diferentes).
>     Para deploy: `cd apps/api && railway up --detach` ou redeploy manual no dashboard.

## 11. Pre-flight final

- [ ] `npm run build` (root) succeeds
- [ ] `npm run smoke:prod` returns FAIL=0
- [ ] `BOOTSTRAP_SECRET` set in Railway
- [ ] `BOOTSTRAP_ENABLED=false` after first MASTER creation
- [ ] `NEXT_PUBLIC_API_URL` set in Vercel Production
- [ ] No `localhost` in any production env var
- [ ] Manual walkthrough §4 passes for at least 1 patient
- [ ] DB snapshot taken before go-live
- [ ] Rollback procedure rehearsed
