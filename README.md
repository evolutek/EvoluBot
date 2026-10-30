# EvoluBot

L'**agent du club** de l'association de robotique Evolutek : un agent [Hermes](https://github.com/NousResearch/hermes-agent) qui automatise le plus possible des tâches de l'association, d'abord sur le Discord du club. Rien n'est encore en place ; le suivi est dans l'epic [#7](https://github.com/evolutek/EvoluBot/issues/7).

Ce dépôt contient ce qui fait de Hermes l'agent d'Evolutek : ses consignes, ses skills, ses tâches cron et ses connecteurs propres au club. Le moteur reste le projet open source Hermes Agent ; la machine qui le fait tourner est décrite dans [evolutek/infra](https://github.com/evolutek/infra).

| Document | Contenu |
|---|---|
| [docs/spec-agent-hermes.md](docs/spec-agent-hermes.md) | Socle, accès, missions et règles de comportement de l'agent |
| [docs/securite-agent.md](docs/securite-agent.md) | Attaques possibles et couches de défense |
| [docs/llm/fournisseurs.md](docs/llm/fournisseurs.md) | Fournisseurs de modèles gratuits et leurs conditions |
| [docs/llm/comptes.md](docs/llm/comptes.md) | Ouvrir et régler les comptes des fournisseurs, les brancher à OmniRoute |
| [docs/llm/banc-essai.md](docs/llm/banc-essai.md) | Comment on compare les modèles et choisit lequel sert quelle tâche |
| [docs/decisions/](docs/decisions/) | Décisions (ADR) |
| [archive/n8n/](archive/n8n/) | Ancien bot n8n, décommissionné |

La présentation du projet aux membres est dans le vault du club, note *Association/Agent du club*.

## Licence

MIT - Association Evolutek
