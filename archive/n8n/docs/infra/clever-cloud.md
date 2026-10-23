# Clever Cloud

[Clever Cloud](https://clever-cloud.com) est un PaaS français (Platform as a Service) qui héberge notre instance [n8n](n8n.md).

## Notre setup

| Composant | Plan | Specs | Rôle |
|-----------|------|-------|------|
| App Node.js & Bun | Autoscale pico → 3XL | 256 Mo à 32 Go RAM | Exécute [n8n](n8n.md) |
| PostgreSQL | XXS Small Space | 512 Mo RAM, 1 Go stockage | Stocke l'état de n8n (workflows, exécutions, credentials) |
| FS Bucket | Basic (gratuit) | 100 Mo | Stocke les fichiers persistants (clés de chiffrement) |

Détails des coûts : voir [couts.md](couts.md).

## Autoscaling

Clever Cloud ajuste automatiquement la taille de l'app en fonction de la charge. C'est un **vertical scaling** : l'instance change de taille (plus de RAM/CPU), pas de nombre.

### Comment ça marche

```mermaid
graph LR
    A[pico<br/>256 Mo] -->|charge CPU| B[S ou M<br/>2-4 Go]
    B -->|retour au calme| A
```

On configure une **plage** : taille min et max. Clever Cloud scale entre les deux.

### Notre configuration

```
Taille min : pico (256 Mo, 1 vCPU)
Taille max : 3XL (32 Go, 16 vCPU)
Instances  : 1 à 4
```

> La plage est large pour ne pas bloquer n8n en cas de gros workflow. En pratique, l'app reste en pico/XS la grande majorité du temps.

### Base de données : taille fixe, upgrade only

La PostgreSQL tourne 24h/24 sur un plan fixe (pas d'autoscaling). On peut **augmenter** la taille du plan via la migration Clever Cloud, mais **pas la réduire** : pour descendre, il faut recréer une base plus petite et migrer les données. Mieux vaut donc commencer petit et scaler si besoin.

## Déploiement

```bash
# Première fois : lier le projet
clever link <APP_ID> --alias n8n

# Déployer
clever deploy --alias n8n
```

Les guides détaillés sont dans [`n8n/deployment/`](../../n8n/deployment/).

## Pourquoi Clever Cloud (solution temporaire)

LeCrabe travaille chez Clever Cloud, ce qui nous donne un accès **gratuit** à la plateforme. C'est pratique pour démarrer sans frais, mais c'est une solution **temporaire**.

L'objectif est de migrer vers un hébergement **sur nos propres machines** (serveur de l'association) pour ne dépendre de personne. La migration sera documentée ici quand elle aura lieu.
