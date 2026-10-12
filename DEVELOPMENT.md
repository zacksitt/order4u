# Order4U — development setup

## Prerequisites

- Node.js 20+
- Docker (Postgres)

## Setup

```bash
cd order4u-dashboard
npm install
cp env.example .env.local
# Set AUTH_SECRET in .env.local
docker compose up -d
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login).

## Demo accounts (after seed)

| Role  | Email             | Password |
| ----- | ----------------- | -------- |
| Agent | agent@demo.shop   | demo     |
| Cargo | cargo1@demo.shop  | demo     |
| Cargo | cargo2@demo.shop  | demo     |

Customer track (no login): `/o/demo-token-123`

## Related docs

- Platform MVP spec: [../Buying_Agent_Cargo_Platform_Technical_Specification.md](../Buying_Agent_Cargo_Platform_Technical_Specification.md)
- Messenger + web intake (requirements & implementation plan): [../Messenger_Web_Intake_Requirements_and_Implementation.md](../Messenger_Web_Intake_Requirements_and_Implementation.md)
- Messenger webhook + ngrok (local): [MESSENGER_LOCAL.md](./MESSENGER_LOCAL.md)

## Scripts

| Script        | Purpose                |
| ------------- | ---------------------- |
| `npm run dev` | Next.js dev server     |
| `db:push`     | Sync schema to DB      |
| `db:seed`     | Demo tenant + orders   |
| `db:studio`   | Prisma Studio          |

## Architecture

- **Auth.js** — JWT session with `tenantId` + role (`agent` | `cargo`)
- **Reads** — `src/server/queries/*` from Server Components
- **Writes** — `src/server/actions/*` Server Actions
- **No mock data** — Postgres required for agent/cargo UI
