# Google Sheets (tracking)

On utilise Google Sheets comme base de donnees legere pour suivre les nouveaux membres.

## Pourquoi Sheets plutot que le stockage n8n

Google Drive est notre outil de travail collaboratif. Stocker le tracking dans un Sheet permet a n'importe quel admin de **visualiser et manipuler** les donnees directement, sans passer par l'interface n8n.

- Accessible a toute l'equipe via Google Drive
- Corrections manuelles possibles en cas de bug
- Suffisant pour le volume d'une association (~10-50 lignes actives)

## Structure du Sheet

| Colonne | Type | Description |
|---------|------|-------------|
| `userId` | string | ID Discord du membre |
| `username` | string | Nom d'affichage |
| `dateAccueil` | date (ISO) | Date ou le membre a ete accueilli |
| `dateLimite` | date (ISO) | Date limite pour completer les etapes (accueil + 28j) |

## Configuration dans n8n

Le Sheet est connecte via **Google Sheets OAuth2**. L'ID du document se trouve dans l'URL :
```
https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
```

## Limites

- Pas de transactions (risque theorique de conflit si deux executions simultanées, mais quasi impossible avec un trigger hebdomadaire)
- Pas de relations entre tables
- Si le volume depasse ~1000 lignes actives, envisager Airtable ou Baserow
