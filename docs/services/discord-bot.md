# Discord Bot

Notre bot Discord est utilise par n8n pour interagir avec le serveur Evolutek.

## Ce qu'il fait

- Lit la liste des membres et leurs roles
- Envoie des messages dans des channels specifiques
- Retire (kick) des membres du serveur

Il n'a **pas** d'interface : il agit uniquement via les workflows n8n.

## Permissions requises

| Permission | Pourquoi |
|------------|----------|
| `GUILD_MEMBERS` (intent privilegiee) | Lire la liste des membres |
| `KICK_MEMBERS` | Retirer les membres expires |
| `SEND_MESSAGES` | Envoyer les messages de bienvenue et logs |
| `VIEW_CHANNEL` | Voir les channels ou il doit ecrire |

> **Intent privilegiee** : `GUILD_MEMBERS` doit etre activee manuellement dans le [portail developpeur Discord](https://discord.com/developers/applications) > Bot > Privileged Gateway Intents.

## Configuration dans n8n

Le bot est configure comme credential **Discord Bot API** dans n8n. Il faut le Bot Token (disponible dans le portail developpeur).

## Concepts cles de l'API Discord

| Terme | Definition |
|-------|-----------|
| **Guild** | Un serveur Discord (identifie par un ID numerique) |
| **Member** | Un utilisateur dans un serveur specifique (avec ses roles dans ce serveur) |
| **Role** | Un tag attribue a un membre (ex: "Inconnu", "Futur-membre", "Admin") |
| **Channel** | Un salon textuel ou vocal (identifie par un ID) |

## Rate limits

L'API Discord limite le nombre de requetes par seconde. Pour les kicks, on espace les appels de 1.5s pour eviter d'etre bloque (erreur `429 Too Many Requests`).
