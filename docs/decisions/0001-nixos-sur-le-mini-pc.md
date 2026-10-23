---
adr: 0001
title: NixOS à l'essai sur le mini PC de l'agent
status: accepted
date: 2026-10-23
scope: framing
supersedes: []
superseded-by: []
---

# ADR-0001 — NixOS à l'essai sur le mini PC de l'agent

## Context and Problem Statement
L'agent du club tourne H24 sur un mini PC du club ([#8](https://github.com/evolutek/cellacom/issues/8)), sans personne devant. Il lit du contenu écrit par des inconnus (Discord, mails) et tourne en conteneur ; la sécurité de la machine repose donc sur les correctifs de l'hôte. Le système se choisit sur les [critères de sécurité de l'agent](../securite-agent.md#critères-pour-choisir-le-système).

## Considered Options

| Option | Correctifs auto, noyau compris | Redémarrage sûr | Surface minimale | Rootless | Config relisible |
|---|---|---|---|---|---|
| Debian | Oui (`unattended-upgrades`) | Non | Oui | Oui | Non |
| Ubuntu Server | Oui (`unattended-upgrades`) | Non | Moyenne (snapd, cloud-init) | Oui | Non |
| Arch | Déconseillé (rolling, intervention manuelle parfois nécessaire) | Non, sauf snapshots Btrfs | Oui | Oui | Non |
| Gentoo | Difficile (compilation de chaque mise à jour) | Non | Oui | Oui | Non |
| Alpine, tout en conteneurs | À scripter (`apk upgrade` + redémarrage) | Non | Très faible | Oui | Services seulement (`compose.yaml`) |
| NixOS | Oui (`system.autoUpgrade`) | Oui (générations) | Oui (seul ce qui est déclaré) | Oui | Oui (hôte entier) |

- **Debian** est aussi écartée parce que ses paquets sont trop anciens.
- **Alpine** reste légère et simple ; sa libc musl ne gêne pas, chaque image de conteneur apportant la sienne.

## Decision Outcome
Chosen option: **NixOS, à l'essai**, because c'est la seule option qui applique seule les correctifs du noyau et revient à la génération précédente si le redémarrage échoue, ce qui permet de garder l'hôte à jour sans personne sur place.

C'est le système que l'on souhaite, pas un choix définitif : on l'installe et on y fait tourner Hermes. Si faire tourner Hermes et ses services s'avère trop galère, on se replie sur **Alpine, tout en conteneurs**, et un nouvel ADR remplace celui-ci.

### Consequences
- Good, because la machine se reconstruit à l'identique depuis le dépôt si le mini PC est remplacé.
- Good, because la configuration de l'hôte se relit et se valide par PR, comme le reste du dépôt.
- Bad, because l'installateur officiel de Hermes et `hermes update` ne marchent pas tels quels : ils posent des binaires précompilés (Python via `uv`) qui cherchent un chargeur dynamique et des bibliothèques que NixOS n'a pas aux chemins habituels. Il faut maintenir l'image du conteneur dans ce dépôt, plutôt que `nix-ld` (compatibilité qui contourne le modèle de NixOS) ou un paquet Nix de Hermes (plus de travail).
- Bad, because NixOS demande d'apprendre le langage Nix à qui maintient la machine.
- Neutral: chaque génération conservée occupe du stockage ; son dimensionnement est dans [materiel-mini-pc.md](../materiel-mini-pc.md).
