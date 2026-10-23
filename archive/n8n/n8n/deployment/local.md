# Local Development

Run n8n locally for development and testing.

## Prerequisites

- [Bun](https://bun.sh) >= 1.0 (recommended) or Node.js >= 22
- PostgreSQL (optional, SQLite used by default)

## Quick Start

```bash
cd n8n
bun install
bun run start
```

n8n starts on port 5678 by default.

## Environment Variables

Create a `.env` file for local configuration:

```bash
# .env (do NOT commit this file)
N8N_PORT=5678
N8N_PROTOCOL=http
N8N_HOST=localhost
N8N_ENCRYPTION_KEY=your-random-encryption-key

# SQLite (default, no config needed)
# Or PostgreSQL:
# DB_TYPE=postgresdb
# DB_POSTGRESDB_HOST=localhost
# DB_POSTGRESDB_PORT=5432
# DB_POSTGRESDB_DATABASE=n8n
# DB_POSTGRESDB_USER=n8n
# DB_POSTGRESDB_PASSWORD=your-password
```

Generate an encryption key:

```bash
openssl rand -hex 32
```

## With Docker (PostgreSQL)

For a more production-like setup:

```bash
# Start PostgreSQL
docker run -d \
  --name n8n-postgres \
  -e POSTGRES_USER=n8n \
  -e POSTGRES_PASSWORD=n8n \
  -e POSTGRES_DB=n8n \
  -p 5432:5432 \
  postgres:17

# Start n8n
DB_TYPE=postgresdb \
DB_POSTGRESDB_HOST=localhost \
DB_POSTGRESDB_PORT=5432 \
DB_POSTGRESDB_DATABASE=n8n \
DB_POSTGRESDB_USER=n8n \
DB_POSTGRESDB_PASSWORD=n8n \
bun run start
```

## Tunnel for Webhooks

For testing webhooks locally, use the built-in tunnel:

```bash
bun run start -- --tunnel
```

Or use [ngrok](https://ngrok.com), [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/), etc.

## Data Location

By default, n8n stores data in `~/.n8n/`:
- `database.sqlite` - SQLite database
- `config` - Configuration
- Uploaded files

## Tips

- Use SQLite for quick local testing
- Use PostgreSQL if you need to test production-like behavior
- The tunnel option is for development only, not production
