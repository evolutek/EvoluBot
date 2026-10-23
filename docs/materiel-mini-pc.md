# Matériel : le mini PC de l'agent

Ce qu'il faut comme machine pour faire tourner l'agent du club H24, et ce qu'il faut vérifier sur le mini PC proposé par le président de l'association. Le logiciel est décrit dans la [spec de l'agent](spec-agent-hermes.md) ; le suivi est dans [#8](https://github.com/evolutek/cellacom/issues/8).

**Statut :** besoins estimés le 2026-10-23. Les caractéristiques du mini PC proposé restent à relever. Système : [ADR-0001](decisions/0001-nixos-sur-le-mini-pc.md).

## Ce qui tourne dessus

Le LLM tourne à distance ([#9](https://github.com/evolutek/cellacom/issues/9)) : la machine n'a **pas besoin de GPU**. La charge est surtout de la mémoire pour une poignée de services légers.

| Service | RAM estimée |
|---|---|
| Système et services de base | ~1 Go |
| Hermes (passerelle Discord + cron), en conteneur | 0,5 à 1 Go |
| OmniRoute auto-hébergé, instance dédiée au bot | ~0,5 Go |
| Serveurs MCP (mail, Drive, GitHub, HackMD, Canva) | 0,1 à 0,3 Go chacun, ~1 Go en tout |
| Enregistreur des réunions vocales Discord | < 0,3 Go |
| *Option :* Whisper local (faster-whisper, modèle small ou medium, sur CPU) | 1 à 5 Go pendant une transcription |

Total : **3 à 4 Go** sans Whisper local, **6 à 9 Go** avec. Ces chiffres sont des ordres de grandeur, à mesurer une fois les services en place.

Whisper sur CPU est la seule charge lourde : avec un modèle medium, transcrire une heure de réunion prend de l'ordre d'une heure sur un processeur de mini PC. C'est acceptable pour un compte rendu posté après la réunion. Si la machine est trop juste, la transcription passe par une API distante ([#16](https://github.com/evolutek/cellacom/issues/16)).

## Besoins

| | Minimum | Conseillé |
|---|---|---|
| CPU | x86_64, 4 cœurs récents (classe Intel N100) | 4 à 8 cœurs (N100, N305, Ryzen mobile) si Whisper tourne en local |
| RAM | 8 Go | 16 Go |
| Stockage | SSD 128 Go | SSD NVMe 256 à 512 Go |
| Réseau | Ethernet filaire | Ethernet filaire |
| GPU | Aucun | Aucun |

- **x86_64 plutôt qu'ARM** : les images de conteneurs et le cache binaire de nixpkgs y sont les plus complets. Un Raspberry Pi est déconseillé, sa carte SD s'use vite sous des écritures continues.
- **Filaire plutôt que Wi-Fi** : la passerelle Discord garde une connexion ouverte en permanence, une coupure Wi-Fi la fait décrocher.

## Stockage

- **Sous NixOS, le store Nix grossit à chaque génération** ([ADR-0001](decisions/0001-nixos-sur-le-mini-pc.md)). Le ramasse-miettes automatique (`nix.gc`) et la déduplication (`nix.optimise`) le contiennent ; 128 Go est un minimum confortable.
- **Enregistrements vocaux** : en Opus à 64 kbit/s, une heure fait ~29 Mo. Deux heures de réunion par semaine représentent ~3 Go par an. Leur rétention se décide dans [#16](https://github.com/evolutek/cellacom/issues/16).
- **Rien ne doit exister uniquement sur le mini PC.** La configuration du système est versionnée dans ce dépôt. Restent à sauvegarder hors de la machine : la mémoire et les sessions de Hermes, la configuration d'OmniRoute, les enregistrements et le fichier de secrets (chiffré).

### NAS

Un NAS du club est prévu à terme. Il recevra les sauvegardes du mini PC et les enregistrements des réunions vocales. D'ici là, il faut une solution de sauvegarde hors machine, à définir dans [#8](https://github.com/evolutek/cellacom/issues/8).

## Tourner H24

- **Reprise après coupure** : dans le BIOS, régler la reprise après coupure de courant (« Restore on AC power loss ») sur *Power On*. Sans ce réglage, la machine reste éteinte après une coupure et l'agent ne revient pas.
- **Services au démarrage** : la passerelle Hermes, OmniRoute et les serveurs MCP démarrent comme services systemd.
- **Consommation** : un mini PC de classe N100 consomme 6 à 15 W, soit 50 à 130 kWh par an, de l'ordre de 10 à 35 € d'électricité.
- **Onduleur** : facultatif sous NixOS, où une coupure pendant une mise à jour ne casse pas le système ([ADR-0001](decisions/0001-nixos-sur-le-mini-pc.md)).
- **À définir** : emplacement de la machine (local du club, ventilation, accès au réseau) et accès à distance pour la maintenance.

## Machine proposée

À relever sur le mini PC proposé, puis comparer aux besoins ci-dessus :

| | Valeur |
|---|---|
| Modèle | à relever |
| CPU (modèle, cœurs) | à relever |
| RAM (quantité, extensible ?) | à relever |
| Stockage (type, taille) | à relever |
| Réseau (Ethernet) | à relever |
| BIOS : reprise après coupure | à vérifier |
