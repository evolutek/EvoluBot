# Branche C : Nettoyage du tracking

Supprime du Google Sheet les entrees qui n'ont plus lieu d'etre suivies.

## Condition de declenchement

`nombreANettoyer > 0`

## Deux sous-cas

| Cas | Detection | Signification |
|-----|-----------|---------------|
| **Parti** | Dans le Sheet mais plus sur le serveur Discord | Le membre a quitte de lui-meme |
| **Devenu membre** | Dans le Sheet, sur le serveur, mais n'a plus le role "Inconnu" | Il a fait les etapes, un admin lui a attribue un nouveau role |

## Flux

```
A nettoyer? --oui--> Separer --> Supprimer du Sheet --> Agreger --> Resume --> Log admin
```

## Noeuds

### 1. Separer a nettoyer (Code)

Eclate la liste en items individuels.

### 2. Supprimer du Sheet (Google Sheets - Delete)

Retire l'entree du tracking (dans les deux cas, le suivi n'est plus necessaire).

### 3. Agreger + Resume + Log

Le message de log **distingue les deux raisons** pour donner de la visibilite aux admins :

```
🧹 Nettoyage du tracking :

2 membre(s) parti(s) d'eux-memes :
  • User1
  • User2

1 membre(s) devenu(s) Futur-membre :
  • User3
```

Envoye dans le **channel admin** (meme channel que les logs de kick).
