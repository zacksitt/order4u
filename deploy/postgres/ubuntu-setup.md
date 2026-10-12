# PostgreSQL on Ubuntu (Order4U)

Same machine as the Next.js app (recommended). The app connects via **`127.0.0.1`** only — do not expose Postgres to the public internet.

## 1. Install PostgreSQL

Ubuntu 22.04 / 24.04:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql --no-pager
```

Default version is usually **PostgreSQL 16** on 24.04, **14–16** on 22.04. Order4U works with **14+**.

Check version:

```bash
psql --version
```

## 2. Create database and user

Pick a strong password (save it for `.env.local`):

```bash
DB_PASS="$(openssl rand -base64 24)"
echo "Save this password: $DB_PASS"
```

Run as the `postgres` system user:

```bash
sudo -u postgres psql <<EOF
CREATE USER order4u WITH PASSWORD '$DB_PASS';
CREATE DATABASE order4u OWNER order4u;
GRANT ALL PRIVILEGES ON DATABASE order4u TO order4u;
\c order4u
GRANT ALL ON SCHEMA public TO order4u;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO order4u;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO order4u;
EOF
```

**Prisma** needs rights on `public` (PostgreSQL 15+ no longer grants this by default).

## 3. Allow local password login

Edit host auth (path may be `16` vs `14` depending on version):

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Ensure these lines exist **above** any broader rules:

```
# Order4U — app on same server
local   order4u         order4u                                 scram-sha-256
host    order4u         order4u         127.0.0.1/32            scram-sha-256
host    order4u         order4u         ::1/128                 scram-sha-256
```

Reload:

```bash
sudo systemctl reload postgresql
```

## 4. Listen on localhost only

```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
```

Set:

```
listen_addresses = 'localhost'
```

Reload PostgreSQL again.

## 5. Test connection

```bash
psql "postgresql://order4u:YOUR_PASSWORD@127.0.0.1:5432/order4u" -c "SELECT 1;"
```

## 6. Wire the app

In **`/path/to/order4u/.env.local`**:

```env
DATABASE_URL="postgresql://order4u:YOUR_PASSWORD@127.0.0.1:5432/order4u?schema=public"
```

From the app directory:

```bash
npm ci
npx prisma generate
npx prisma db push      # creates tables (no migration history in repo yet)
npm run db:seed         # demo agent / cargo / shop — optional
```

Verify:

```bash
sudo -u postgres psql -d order4u -c "\dt"
```

Restart the app after changing env:

```bash
pm2 restart order4u
```

## 7. Backups (minimal)

Daily dump example (cron as root or deploy user):

```bash
sudo mkdir -p /var/backups/order4u
sudo -u postgres pg_dump -Fc order4u > /var/backups/order4u/order4u-$(date +%F).dump
```

Keep 7–14 days; copy off-server if possible.

Restore:

```bash
sudo -u postgres pg_restore -d order4u --clean --if-exists /var/backups/order4u/order4u-YYYY-MM-DD.dump
```

## Alternative: Docker Postgres on the server

If you prefer matching local dev (`docker-compose.yml`):

```bash
cd /path/to/order4u
docker compose up -d postgres
```

Then use port **5433** on the host:

```env
DATABASE_URL="postgresql://order4u:order4u@127.0.0.1:5433/order4u?schema=public"
```

Change the compose password before production, or use the native install above for a single open port (5432 internal only).

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `password authentication failed` | Check password in `DATABASE_URL`; `pg_hba.conf` lines for user `order4u` |
| `permission denied for schema public` | Re-run GRANT steps in §2 |
| `Connection refused` | `systemctl status postgresql`; wrong port in URL |
| Prisma `P1001` | Firewall blocking **local** socket — use `127.0.0.1` not remote IP |
