# n8n

[n8n](https://n8n.io) est une plateforme open-source d'automatisation de workflows. C'est l'equivalent de Zapier ou Make, mais auto-hebergeable et gratuit.

## Pourquoi n8n

- **Open-source** : pas de cout de licence
- **Self-hosted** : on controle nos donnees
- **Low-code** : interface visuelle, accessible aux non-devs
- **Extensible** : noeuds Code (JavaScript) pour la logique custom

## Comment ca marche

Un workflow n8n c'est une chaine de **noeuds** connectes :

```
[Trigger] -> [Action 1] -> [Condition] -> [Action 2]
```

- **Trigger** : ce qui declenche le workflow (horaire, webhook, evenement...)
- **Noeud** : une operation (appel API, traitement de donnees, condition...)
- **Connexion** : le flux de donnees entre les noeuds

## Notre instance

- **URL** : hebergee sur [Clever Cloud](clever-cloud.md)
- **Version** : n8n 2.4.6
- **Runtime** : Bun (plus rapide que Node.js)
- **Donnees** : PostgreSQL + FS Bucket

## Ressources

- [Documentation officielle](https://docs.n8n.io)
- [Liste des noeuds disponibles](https://n8n.io/integrations)
