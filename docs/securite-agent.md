# Sécurité de l'agent

Comment l'agent peut être attaqué, comment on le protège, et ce que ça exige du système du mini PC. Les droits de l'agent sur chaque plateforme sont dans la [spec](spec-agent-hermes.md#accès) ; le choix du système applique les critères ci-dessous dans l'[ADR-0001](decisions/0001-nixos-sur-le-mini-pc.md).

## Par où arrivent les attaques

L'agent lit en continu du contenu écrit par des inconnus : les messages du Discord (dont ceux des nouveaux arrivants), les mails reçus par le club en lecture seule, les réponses au formulaire d'inscription.

Un de ces textes peut contenir des instructions déguisées (*prompt injection*) : « ignore tes consignes et lance telle commande ». Hermes a un outil terminal et écrit ses propres skills ; un agent détourné exécute donc des commandes sur la machine qui le fait tourner. Avec les agents autonomes qui scannent et exploitent les failles en masse, il faut partir du principe que ça arrivera, pas que ça pourrait arriver.

## Les couches de défense

Chaque couche couvre l'échec de la précédente.

| Couche | Ce qu'elle limite | Où c'est décrit |
|---|---|---|
| Droits minimaux sur les plateformes | Ce qu'un agent détourné peut faire avec ses jetons (kicker, modifier le fichier des membres) | [Spec : accès](spec-agent-hermes.md#accès) |
| Conteneur | Ce qu'une commande injectée peut toucher sur la machine | Ci-dessous |
| Runtime rootless | Ce que rapporte une évasion du conteneur | Ci-dessous |
| Correctifs de l'hôte | Les chances qu'une évasion réussisse | [Critères du système](#critères-pour-choisir-le-système) |

### Le conteneur ne suffit pas seul

Un conteneur n'est pas une machine virtuelle : il partage le noyau de l'hôte. Ce qui empêche Hermes de sortir de son conteneur pour accéder au reste de la machine, c'est le noyau et le runtime de conteneurs (runc, crun, Podman), donc des paquets de l'hôte. Les évasions de conteneur exploitent justement des failles de ces composants, par exemple [runc CVE-2024-21626](https://github.com/opencontainers/runc/security/advisories/GHSA-xr7r-f8xq-vfvv) (sévérité haute).

Mettre l'agent en conteneur ne rend donc pas les mises à jour de l'hôte inutiles : il en fait la dernière barrière.

### Règles du conteneur

- **Utilisateur non root** dans le conteneur.
- **Runtime rootless** (Podman rootless ou user namespaces) : un « root » dans le conteneur n'est qu'un utilisateur sans droits sur l'hôte, ce qui limite les dégâts d'une évasion.
- **Jamais de socket Docker monté** : y accéder revient à être root sur l'hôte.
- **Capabilities retirées** (`--cap-drop=ALL`) et `no-new-privileges`.
- **Système de fichiers en lecture seule**, sauf les volumes de données de l'agent.
- **Images à jour** : les bibliothèques des images ont leurs propres failles ; elles se reconstruisent régulièrement, indépendamment des mises à jour de l'hôte.

## Critères pour choisir le système

Ils découlent des couches ci-dessus : sur un hôte qui ne fait tourner que des conteneurs, le système compte surtout par la façon dont il applique ses correctifs.

| Critère | Pourquoi |
|---|---|
| **Correctifs automatiques, noyau compris** | Le noyau et le runtime sont la barrière du conteneur ; un correctif qui attend une intervention humaine laisse la faille ouverte. |
| **Redémarrage sûr** | Un correctif du noyau n'agit qu'après redémarrage. Si un redémarrage raté laisse la machine éteinte dans le local, on finit par reporter les mises à jour : il faut pouvoir revenir seul à la version précédente. |
| **Surface minimale** | Chaque service ou paquet installé sur l'hôte est une faille possible de plus. |
| **Runtime rootless disponible** | Sans lui, une évasion du conteneur donne root sur l'hôte. |
| **Configuration de l'hôte relisible** | Pare-feu, SSH et services se relisent et se valident par PR ; une modification faite à la main sur la machine ne passe pas inaperçue. |
