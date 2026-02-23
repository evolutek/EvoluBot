# CellaCom

Automation platform for the [Evolutek](https://music-music.music) robotics association.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Clever Cloud                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                        n8n                            │  │
│  │   Triggers ─► Workflows ─► Actions (Discord, etc.)   │  │
│  └───────────────────────────────────────────────────────┘  │
│              │                                              │
│  ┌───────────┴───────────┐  ┌─────────────────┐            │
│  │      PostgreSQL       │  │    FS Bucket    │            │
│  │        (data)         │  │     (files)     │            │
│  └───────────────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## Active Workflows

| Workflow | Description | Docs |
|----------|-------------|------|
| CellaCom - Gestion hebdomadaire | Weekly Discord member onboarding, kick, cleanup & purge | [docs](docs/workflows/gestion-hebdomadaire/) |

## Repository Structure

```
cellacom/
├── docs/                   # Technical documentation (DRY, atomized)
│   ├── infra/              # n8n, Clever Cloud, costs
│   ├── services/           # Discord bot, Google Sheets
│   └── workflows/          # Per-workflow documentation
├── n8n/                    # n8n deployment config
│   ├── deployment/         # Deployment guides (local, Clever Cloud)
│   ├── package.json
│   └── bun.lock
├── workflows/              # Exported workflow schemas (backup)
└── README.md
```

## Deployment

### n8n (Clever Cloud)

```bash
# Link (first time)
clever link <APP_ID> --alias n8n

# Deploy
clever deploy --alias n8n
```

See [n8n/deployment/clever-cloud.md](n8n/deployment/clever-cloud.md).

### Local Development

```bash
cd n8n
bun install
bun run start
```

See [n8n/deployment/local.md](n8n/deployment/local.md).

## License

MIT - Evolutek Association
