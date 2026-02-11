# Branche B : Kick des membres expires

Retire du serveur les membres qui n'ont pas complete les etapes dans le delai imparti.

## Condition de declenchement

`nombreAKick > 0`

Un membre est "a kicker" si :
- Il est dans le Google Sheet (donc deja accueilli)
- Sa `dateLimite` est depassee
- Il a **toujours** le role "Inconnu" (n'a pas fait les etapes)

## Flux

```
A kicker? --oui--> Separer --> Kick API --> Retirer du Sheet --> Agreger --> Resume --> Log admin
```

## Noeuds

### 1. Separer membres (Code)

Eclate la liste en items individuels (un par membre) pour traitement sequentiel.

### 2. Kick (HTTP DELETE)

Appel API Discord : `DELETE /guilds/{guild_id}/members/{user_id}`

- **Batching** : 1 requete toutes les 1.5 secondes
- Le membre est retire du serveur (il peut re-rejoindre via lien d'invitation)

> Le batching est crucial : l'API Discord a des [rate limits](../../services/discord-bot.md#rate-limits) stricts. Sans delai, on recoit une erreur `429 Too Many Requests`.

### 3. Retirer du Sheet (Google Sheets - Delete)

Supprime la ligne du tracking.

### 4. Agreger + Resume + Log

Regroupe les resultats, construit un message recapitulatif et l'envoie dans le **channel admin** (prive) :

```
⚠️ 3 membre(s) retire(s) du serveur (date limite depassee) :
• User1 (date limite : 2025-01-15)
• User2 (date limite : 2025-01-15)
```

## Note importante

Le membre n'est **pas** prevenu par DM avant le kick. Il a ete informe de la date limite dans le message de bienvenue public.
