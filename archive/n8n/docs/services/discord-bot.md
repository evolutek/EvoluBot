# Discord Bot

Notre bot Discord est utilisé par n8n pour interagir avec le serveur Evolutek.

## Ce qu'il fait

- Lit la liste des membres et leurs rôles
- Envoie des messages dans des channels spécifiques
- Retire (kick) des membres du serveur

Il n'a **pas** d'interface : il agit uniquement via les workflows n8n.

## Permissions requises

| Permission | Pourquoi |
|------------|----------|
| `GUILD_MEMBERS` (intent privilégiée) | Lire la liste des membres |
| `KICK_MEMBERS` | Retirer les membres expirés |
| `SEND_MESSAGES` | Envoyer les messages de bienvenue et logs |
| `VIEW_CHANNEL` | Voir les channels où il doit écrire |

> **Intent privilégiée** : `GUILD_MEMBERS` doit être activée manuellement dans le [portail développeur Discord](https://discord.com/developers/applications) > Bot > Privileged Gateway Intents.

## Configuration dans n8n

Le bot est configuré comme credential **Discord Bot API** dans n8n. Il faut le Bot Token (disponible dans le portail développeur).

## Concepts clés de l'API Discord

| Terme | Définition |
|-------|-----------|
| **Guild** | Un serveur Discord (identifié par un ID numérique) |
| **Member** | Un utilisateur dans un serveur spécifique (avec ses rôles dans ce serveur) |
| **Role** | Un tag attribué à un membre (ex: "Inconnu", "Futur-membre", "Admin") |
| **Channel** | Un salon textuel ou vocal (identifié par un ID) |

## Rate limits

L'API Discord limite le nombre de requêtes par seconde. Pour les kicks, on espace les appels de 1.5s pour éviter d'être bloqué (erreur `429 Too Many Requests`).
