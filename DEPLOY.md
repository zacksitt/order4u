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
| `AUTH_URL` | `https://order4u.mmappdemo.space` (must match browser URL, **https**) |
| `APP_URL` | `https://order4u.mmappdemo.space` |
| `AUTH_SECRET` | same value in **`.env`** and **`.env.local`** if you use both |

Put secrets in **`.env`** at minimum (Prisma + pm2 start script). After any env change: `npm run build` is not required, but **`pm2 restart order4u`** is.

### Login session not sticking

- **`AUTH_SECRET`** missing → Auth.js cannot sign cookies (start script now exits if unset).
- **`AUTH_URL` / `APP_URL` still `http://localhost:3000`** on the server → cookies/redirects wrong; set to your public **https** origin.
- nginx must send **`X-Forwarded-Proto $scheme`** (see `deploy/nginx/order4u.conf.example`).
- Demo login after seed: `agent@demo.shop` / `demo`.

### Staff PWA on production

Manifest and `/serwist/sw.js` must return 200 (check DevTools → Application). **Install:** Chrome address bar, or iPhone **Safari → Share → Add to Home Screen** (not Chrome in-app). PWA opens `/login`; with a valid session you are redirected to agent/cargo home.
| Messenger vars | Page token, verify token, app secret, `MESSENGER_PAGE_ID` |

Build and DB:

```bash
npm ci
npm run build
npx prisma db push          # schema to DB (use migrate deploy when migrations exist)
npm run db:seed             # optional demo users
```

## 2. Process manager (pm2)

**Build in the app directory first** — `next start` fails without `.next/`:

```bash
cd /root/app/order4u   # your clone path
npm run build          # must finish without errors
ls .next/BUILD_ID      # should exist
```

```bash
npm install -g pm2
chmod +x scripts/start-production.sh
pm2 delete order4u 2>/dev/null || true
pm2 start deploy/pm2/ecosystem.config.cjs
pm2 save
pm2 startup
```

The ecosystem file resolves the repo path automatically (works even if the clone is not `/root/app/order4u`).

App must bind **127.0.0.1:3000** so only nginx is public.

### `production-start-no-build-id`

Build **in the same folder as `package.json`**, then confirm:

```bash
cd /root/app/order4u
npm run build
test -f .next/BUILD_ID && echo "OK" || echo "BUILD FAILED — read npm output above"
pm2 restart order4u
```

If `npm run build` fails (often **out of memory** on small VPS), add swap or build on your laptop and rsync `.next` (not ideal) or upgrade the droplet.

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

### “Welcome to nginx” (default page)

nginx is serving **`sites-enabled/default`**, not Order4U. Fix:

```bash
ls -la /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Use your **domain** in the browser (`https://order4u.mmappdemo.space/login`), not `http://146.190.x.x` — the config only matches **`server_name order4u.mmappdemo.space`**.

Checklist:

| Check | Command |
|-------|---------|
| Order4U site linked | `ls /etc/nginx/sites-enabled/order4u` |
| Config valid | `sudo nginx -t` |
| App up locally | `curl -I http://127.0.0.1:3000/login` |
| DNS | `dig +short order4u.mmappdemo.space` → your server IP |
| HTTPS vhost | `curl -I https://order4u.mmappdemo.space/login` |

If you must hit the server **by IP** temporarily, add `default_server` to the `listen 443` line in `/etc/nginx/sites-available/order4u` and set `server_name` to include the IP or `_` (not recommended for production).

### HTTP redirects but **HTTPS 404** (nginx, ~162 bytes)

Port **80** uses your Order4U config; port **443** is still the **default SSL** site (or another vhost). Fix:

```bash
# See every vhost on 443
sudo nginx -T 2>/dev/null | grep -E "listen 443|server_name"

ls -la /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

Ensure **`/etc/nginx/sites-available/order4u`** has the full **`server { listen 443 ssl; ... proxy_pass ... }`** block (see `deploy/nginx/order4u.conf.example`), with valid cert paths:

```bash
sudo certbot --nginx -d order4u.mmappdemo.space
sudo nginx -t && sudo systemctl reload nginx
curl -I https://order4u.mmappdemo.space/login   # expect 200 from Next, not nginx 404
curl -I http://127.0.0.1:3000/login             # must work first
```

If certbot created a **second** file (e.g. `order4u-le-ssl.conf`) with only SSL and no `proxy_pass`, merge proxy settings into one site file or delete the duplicate and re-run certbot on the combined config.

If `nginx -t` warns **`conflicting server name "order4u.mmappdemo.space" ... ignored`**, two `server { }` blocks use the same name (often certbot added a stub **without** `proxy_pass`). nginx keeps the **first** block — often the wrong one → **HTTPS 404**.

```bash
grep -n "server_name\|listen 443\|proxy_pass" /etc/nginx/sites-available/order4u
grep -r "order4u.mmappdemo.space" /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo cp /root/app/order4u/deploy/nginx/order4u.conf.example /etc/nginx/sites-available/order4u
# Ensure only ONE pair of server blocks (80 + 443) in that file — delete certbot duplicates inside the file
sudo nginx -t && sudo systemctl reload nginx
```

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
