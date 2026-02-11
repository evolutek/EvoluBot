# Clever Cloud

[Clever Cloud](https://clever-cloud.com) est un PaaS francais (Platform as a Service) qui heberge notre instance n8n.

## Notre setup

| Composant | Type | Role |
|-----------|------|------|
| App Node.js | Nano (512 MB) | Execute n8n |
| PostgreSQL | Dev (256 MB) | Stocke les workflows et executions |
| FS Bucket | Gratuit | Stocke les fichiers (credentials chiffrees, etc.) |

## Deploiement

```bash
# Premiere fois : lier le projet
clever link <APP_ID> --alias n8n

# Deployer
clever deploy --alias n8n
```

Les guides detailles sont dans [`n8n/deployment/`](../../n8n/deployment/).

## Pourquoi Clever Cloud

- Hebergeur **francais** (donnees en France)
- Tier gratuit suffisant pour une asso
- Deploiement Git simple (`clever deploy`)
- Addons PostgreSQL et stockage inclus

## A terme : self-hosting

Clever Cloud est la solution actuelle, mais l'objectif est de migrer vers un hebergement **sur nos propres machines** (serveur de l'association). Cela permettra :
- 0 EUR de frais d'hebergement
- Controle total de l'infrastructure
- Apprentissage sysadmin pour les membres

La migration sera documentee ici quand elle aura lieu.
