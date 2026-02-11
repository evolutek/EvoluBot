# Branche A : Accueil des nouveaux

Detecte les membres avec le role "Inconnu" qui n'ont pas encore ete accueillis, leur envoie un message de bienvenue et les ajoute au tracking.

## Condition de declenchement

`nombreNouveaux > 0`

Un membre est considere "nouveau" si :
- Il a le role **Inconnu** sur Discord
- Il n'est **pas** dans le Google Sheet de tracking
- Il n'est **pas** un bot

## Flux

```
Nouveaux? --oui--> Construire message --> Envoyer sur Discord --> Preparer donnees --> Ajouter au Sheet
```

## Noeuds

### 1. Construire message (Code)

Genere un message de bienvenue **adaptatif** selon le nombre de nouveaux :

- **1 nouveau** : tutoiement ("tu es le nouveau", "ta presentation")
- **Plusieurs** : vouvoiement ("vous etes les nouveaux", "votre presentation")

Le message contient :
- Mention(s) des nouveaux (`@user`)
- Explication du role "Inconnu" et des etapes pour devenir "Futur-membre"
- Les 2 etapes : presentation dans le channel dedie **ET** formulaire Google
- La date limite (4 semaines)
- Liens reseaux sociaux de l'association

### 2. Envoyer message (Discord)

Poste le message dans le channel **#presentations**.

### 3. Preparer donnees sheet (Code)

Formate chaque nouveau en ligne de spreadsheet :
- `userId`, `username`, `dateAccueil` (aujourd'hui), `dateLimite` (+28 jours)

### 4. Ajouter au Sheet (Google Sheets - Append)

Insere les lignes dans le [Sheet de tracking](../../services/google-sheets.md).

## Garde-fou

- **Max 20 nouveaux par semaine** : si plus de 20 arrivent, les suivants sont reportes a la semaine d'apres (tries par date d'arrivee, les plus anciens d'abord)
