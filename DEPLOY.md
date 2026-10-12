# Deploy Order4U (VPS + nginx)

Assumes Ubuntu/Debian, Node 20+, PostgreSQL, domain e.g. **`https://order4u.mmappdemo.space`**.

## 0. PostgreSQL on Ubuntu

Full steps: **[deploy/postgres/ubuntu-setup.md](./deploy/postgres/ubuntu-setup.md)**

Quick sequence:

```bash
sudo apt install -y postgresql postgresql-contrib
# Create user `order4u`, database `order4u`, set password — see ubuntu-setup.md
```

`DATABASE_URL` on the server:

```env
DATABASE_URL="postgresql://order4u:YOUR_PASSWORD@127.0.0.1:5432/order4u?schema=public"
```

Then `npx prisma db push` and `npm run db:seed` from the app directory.

## 1. Environment

On the server, clone and configure:

```bash
git clone git@github.com:zacksitt/order4u.git
cd order4u
cp env.example .env.local
```

Edit **`.env.local`** (production):

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | `postgresql://user:pass@127.0.0.1:5432/order4u?schema=public` |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://order4u.mmappdemo.space` |
| `APP_URL` | `https://order4u.mmappdemo.space` |
| Messenger vars | Page token, verify token, app secret, `MESSENGER_PAGE_ID` |

Build and DB:

```bash
npm ci
npm run build
npx prisma db push          # schema to DB (use migrate deploy when migrations exist)
npm run db:seed             # optional demo users
```

## 2. Process manager (pm2)

```bash
npm install -g pm2
pm2 start npm --name order4u -- start -- -H 127.0.0.1 -p 3000
pm2 save
pm2 startup
```

App must bind **127.0.0.1:3000** so only nginx is public.

## 3. nginx

Example site config: **[deploy/nginx/order4u.conf.example](./deploy/nginx/order4u.conf.example)**

```bash
sudo cp deploy/nginx/order4u.conf.example /etc/nginx/sites-available/order4u
# Edit server_name and SSL paths if needed
sudo ln -sf /etc/nginx/sites-available/order4u /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### TLS (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d order4u.mmappdemo.space
```

Certbot updates `ssl_certificate` paths in the site file.

### Change domain later

1. Update `server_name` in nginx and reload.
2. New cert: `sudo certbot --nginx -d new.domain`.
3. Update `AUTH_URL`, `APP_URL` in `.env.local`, rebuild if needed, restart pm2.

## 4. Meta Messenger webhook

After HTTPS is live:

- **Callback URL:** `https://order4u.mmappdemo.space/api/webhooks/messenger`
- **Verify token:** same as `MESSENGER_VERIFY_TOKEN`
- Subscribe Page to your app; run setup menu (see `MESSENGER_LOCAL.md`) with production URL.

## 5. Staff PWA

Use the same HTTPS origin in Safari/Chrome → **Add to Home Screen**. No extra nginx rules; manifest at `/manifest.webmanifest`, SW at `/serwist/sw.js`.

## 6. Updates

```bash
cd order4u
git pull
npm ci
npm run build
npx prisma db push
pm2 restart order4u
```
