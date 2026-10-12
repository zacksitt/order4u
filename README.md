# Order4U Dashboard

Buying Agent + Cargo platform (Thailand → Myanmar).

- Requirements: [`../Buying_Agent_Cargo_Platform_Requirements.docx`](../Buying_Agent_Cargo_Platform_Requirements.docx)
- Technical spec: [`../Buying_Agent_Cargo_Platform_Technical_Specification.md`](../Buying_Agent_Cargo_Platform_Technical_Specification.md)

## Stack

- Next.js App Router, Server Actions, Prisma + PostgreSQL, Auth.js
- React 19, TypeScript, Tailwind CSS v4

## Run locally

See **[DEVELOPMENT.md](./DEVELOPMENT.md)** — Postgres and `AUTH_SECRET` are required.

```bash
npm install
cp env.example .env.local
docker compose up -d
npm run db:push && npm run db:seed
npm run dev
```

## Routes

| Route | Role |
|-------|------|
| `/login` | Staff sign-in |
| `/agent/*` | Agent (session) |
| `/cargo/*` | Cargo (session) |
| `/o/[token]` | Customer track + invoices |
