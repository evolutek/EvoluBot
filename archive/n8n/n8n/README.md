# CellaCom n8n

Workflow automation platform for Evolutek, powered by [n8n](https://n8n.io).

## What is n8n?

n8n is an open-source workflow automation platform with 400+ integrations. It allows building complex automations visually or with code (JavaScript/Python).

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    n8n Server                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Webhooks │  │ Triggers │  │ Scheduled Tasks  │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       └─────────────┼─────────────────┘            │
│                     ▼                               │
│            ┌────────────────┐                       │
│            │   Workflows    │                       │
│            └───────┬────────┘                       │
│                    │                                │
│  ┌─────────────────┼─────────────────┐             │
│  ▼                 ▼                 ▼             │
│ Discord         APIs            Databases          │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────┐
            │  PostgreSQL    │  (workflows, credentials, executions)
            └────────────────┘
```

## Requirements

- **Runtime**: Node.js >= 22 or Bun >= 1.0
- **Database**: PostgreSQL (recommended) or SQLite (dev only)
- **Storage**: Persistent filesystem for uploaded files

## Quick Start

### Using Bun (recommended)

```bash
cd n8n
bun install
bun run start
```

### Using npm

```bash
cd n8n
npm install
npm start
```

## Configuration

n8n is configured via environment variables. Key variables:

| Variable | Description |
|----------|-------------|
| `N8N_PORT` | Server port |
| `N8N_PROTOCOL` | `http` or `https` |
| `N8N_HOST` | Hostname |
| `N8N_ENCRYPTION_KEY` | Key for encrypting credentials |
| `DB_TYPE` | `postgresdb` or `sqlite` |
| `WEBHOOK_URL` | Public URL for webhooks |

See [n8n Environment Variables](https://docs.n8n.io/hosting/configuration/environment-variables/) for full list.

## Deployment

See the `deployment/` directory for platform-specific guides:

- **[Local Development](deployment/local.md)** - Run locally for development
- **[Clever Cloud](deployment/clever-cloud.md)** - Production deployment on Clever Cloud

## Current Workflows

| Workflow | Description | Status |
|----------|-------------|--------|
| Discord Welcome Bot | Welcome new members, assign roles, kick unknown users | ✅ Active |

## Version

- **n8n**: ^2.4.6 (January 2026)
- **Previous**: ^1.113.3 (December 2025)

### n8n 2.0 Notes

n8n 2.0 (December 2025) introduced breaking changes:
- PostgreSQL required (MySQL/MariaDB dropped)
- Task runners moved to separate image
- See [migration guide](https://docs.n8n.io/2-0-breaking-changes/)

## Security

- **Never commit secrets** (encryption keys, DB passwords, API tokens)
- Credentials in n8n are encrypted with `N8N_ENCRYPTION_KEY`
- Use environment variables for all sensitive configuration

## Resources

- [n8n Documentation](https://docs.n8n.io)
- [n8n Community](https://community.n8n.io)
- [n8n GitHub](https://github.com/n8n-io/n8n)
