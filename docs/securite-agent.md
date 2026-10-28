# Sécurité de l'agent

Comment l'agent peut être attaqué et comment on le protège. Les droits de l'agent sur chaque plateforme sont dans la [spec](spec-agent-hermes.md#accès) ; la protection de la machine qui le fait tourner (conteneur, rootless, correctifs, chiffrement) est dans le dépôt [infra](https://github.com/evolutek/infra), page `docs/securite-hote.md`.

## Par où arrivent les attaques

L'agent lit en continu du contenu écrit par des inconnus : les messages du Discord (dont ceux des nouveaux arrivants), les mails reçus par le club en lecture seule, les réponses au formulaire d'inscription.

Un de ces textes peut contenir des instructions déguisées (*prompt injection*) : « ignore tes consignes et lance telle commande ». Hermes a un outil terminal et écrit ses propres skills ; un agent détourné exécute donc des commandes sur la machine qui le fait tourner. Avec les agents autonomes qui scannent et exploitent les failles en masse, il faut partir du principe que ça arrivera, pas que ça pourrait arriver.

## Les couches de défense

Chaque couche couvre l'échec de la précédente.

| Couche | Ce qu'elle limite | Où c'est décrit |
|---|---|---|
| Droits minimaux sur les plateformes | Ce qu'un agent détourné peut faire avec ses jetons (kicker, modifier le fichier des membres) | [Spec : accès](spec-agent-hermes.md#accès) |
| Comportement versionné | Un skill modifié par l'agent ne s'applique qu'après relecture humaine d'une PR sur ce dépôt | [Spec : règles de comportement](spec-agent-hermes.md#règles-de-comportement) |
| Conteneur et runtime rootless | Ce qu'une commande injectée peut toucher sur la machine, et ce que rapporte une évasion | dépôt infra, `docs/securite-hote.md` |
| Correctifs de l'hôte | Les chances qu'une évasion réussisse | dépôt infra, `docs/securite-hote.md` |
| Dépôts séparés | L'agent ouvre ses PR ici, jamais sur infra : il ne peut pas modifier la configuration de sa propre machine | dépôt infra, `docs/securite-hote.md` |
