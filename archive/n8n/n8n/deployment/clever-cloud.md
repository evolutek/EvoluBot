# Clever Cloud Deployment

Production deployment on [Clever Cloud](https://clever-cloud.com).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Clever Cloud                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Node.js/Bun   │  │  PostgreSQL DB  │  │  FS Bucket  │ │
│  │   (n8n server)  │──│   (data)        │  │  (files)    │ │
│  └────────┬────────┘  └─────────────────┘  └─────────────┘ │
└───────────┼─────────────────────────────────────────────────┘
            │ HTTPS
            ▼
      External Services
```

## Prerequisites

- [Clever Cloud account](https://console.clever-cloud.com)
- [clever-tools CLI](https://github.com/CleverCloud/clever-tools)

```bash
npm install -g clever-tools
clever login
```

## Link to Existing App

```bash
cd n8n
clever link <APP_ID> --alias n8n
```

## Deploy

```bash
clever deploy --alias n8n
```

## Using Bun Instead of npm

To use Bun as runtime (faster, native PostgreSQL client):

```bash
# Generate bun.lock
bun install --lockfile-only

# Commit it
git add bun.lock
git commit -m "chore: add bun.lock for Bun runtime"

# Deploy
clever deploy --alias n8n
```

Clever Cloud auto-detects Bun via `bun.lock`.

Or set explicitly:

```bash
clever env set CC_NODE_BUILD_TOOL bun --alias n8n
```

## Environment Variables

Configured via Clever Cloud Console or CLI:

```bash
# View current config
clever env --alias n8n

# Set a variable
clever env set VARIABLE_NAME value --alias n8n
```

### Required Variables

| Variable | Description |
|----------|-------------|
| `N8N_PORT` | `8080` (Clever Cloud requirement) |
| `N8N_PROTOCOL` | `https` |
| `N8N_HOST` | Your app domain |
| `N8N_ENCRYPTION_KEY` | Random 32-byte hex string |
| `WEBHOOK_URL` | `https://<YOUR_DOMAIN>/` |
| `DB_TYPE` | `postgresdb` |
| `DB_POSTGRESDB_*` | From PostgreSQL addon |
| `DATA_FOLDER` | `/app/data/` |
| `CC_FS_BUCKET` | From FS Bucket addon |
| `N8N_RUNNERS_ENABLED` | `true` |

### Execution Settings

```bash
EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=true
EXECUTIONS_DATA_SAVE_ON_ERROR=all
EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
```

## Useful Commands

```bash
# Status
clever status --alias n8n

# Logs
clever logs --alias n8n

# Restart
clever restart --alias n8n

# Scale
clever scale --alias n8n --instances 1:4 --flavor S:3XL

# Open in browser
clever open --alias n8n

# Activity history
clever activity --alias n8n
```

## Initial Setup (Reference)

If setting up from scratch:

1. Create Node.js application
2. Add PostgreSQL addon (min XXS, XS+ recommended)
3. Add FS Bucket addon
4. Link addons to application
5. Set environment variables
6. Deploy

See [CleverCloud/n8n-example](https://github.com/CleverCloud/n8n-example) for detailed guide.

## Data & Backups

- **Workflows/Credentials**: Stored in PostgreSQL (automatic backups by Clever Cloud)
- **Uploaded files**: Stored in FS Bucket
- **Encryption key**: Critical! Store `N8N_ENCRYPTION_KEY` securely. Without it, credentials cannot be decrypted.

## Troubleshooting

### App won't start

```bash
clever logs --alias n8n
```

Common issues:
- Missing environment variables
- Database connection failed
- Port must be 8080

### Webhook not working

- Ensure `WEBHOOK_URL` is set correctly with trailing slash
- Check workflow is activated
