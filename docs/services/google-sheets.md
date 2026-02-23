# Google Sheets (tracking)

On utilise Google Sheets comme base de données légère pour suivre les nouveaux membres.

## Pourquoi Sheets plutôt que le stockage n8n

Google Drive est notre outil de travail collaboratif. Stocker le tracking dans un Sheet permet à n'importe quel admin de **visualiser et manipuler** les données directement, sans passer par l'interface n8n.

- Accessible à toute l'équipe via Google Drive
- Corrections manuelles possibles en cas de bug
- Suffisant pour le volume d'une association (~10-50 lignes actives)

## Structure du Sheet

| Colonne | Type | Description |
|---------|------|-------------|
| `userId` | string | ID Discord du membre |
| `username` | string | Username Discord réel (`user.username`, pas le display name) |
| `dateAccueil` | date (ISO) | Date où le membre a été accueilli |
| `dateLimite` | date (ISO) | Date limite pour compléter les étapes (accueil + 28j) |
| `statut` | string | État du membre : `actif`, `kicked`, `parti`, `devenu_membre` |
| `dateAction` | date (ISO) | Date du dernier changement de statut |

### Soft delete et rétention

Les lignes ne sont **jamais supprimées** immédiatement. Quand un membre est kické, part, ou devient membre actif, sa ligne est **marquée** avec le statut correspondant et la date de l'action. Cela permet :

- **Traçabilité** : historique des passages de chaque membre
- **Corrections** : un admin peut réactiver un membre marqué par erreur
- **Rétention 24 semaines** : les lignes archivées sont purgées automatiquement après 24 semaines

Seule la branche [Purge](../workflows/gestion-hebdomadaire/purge.md) supprime réellement des lignes, après expiration de la période de rétention.

## Configuration dans n8n

Le Sheet est connecté via **Google Sheets OAuth2**. L'ID du document se trouve dans l'URL :
```
https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
```

## Limites

- Pas de transactions (risque théorique de conflit si deux exécutions simultanées, mais quasi impossible avec un trigger hebdomadaire)
- Pas de relations entre tables
- Si le volume dépasse ~1000 lignes actives, envisager Airtable ou Baserow
